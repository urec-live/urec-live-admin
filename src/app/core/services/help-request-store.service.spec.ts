import { TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, of, throwError } from 'rxjs';
import { HelpRequest, HelpRequestStatus } from '../models/help-request.model';
import { HelpRequestService } from './help-request.service';
import { HelpRequestStore, HELP_POLL_MS } from './help-request-store.service';
import { ChimeService } from './chime.service';

const NOW = new Date().toISOString();

function helpRequest(id: number, status: HelpRequestStatus = 'REQUEST_RECEIVED', overrides: Partial<HelpRequest> = {}): HelpRequest {
  return {
    id,
    status,
    equipmentId: 10 + id,
    equipmentCode: `LP0${id}`,
    equipmentName: `Leg Press ${id}`,
    floorLabel: 'Floor 1',
    exerciseName: null,
    memberUsername: 'jdoe',
    staffUsername: null,
    createdAt: NOW,
    updatedAt: NOW,
    firstResponseAt: null,
    closedAt: null,
    closedBy: null,
    ...overrides,
  };
}

describe('HelpRequestStore', () => {
  let store: HelpRequestStore;
  let service: jasmine.SpyObj<HelpRequestService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let chime: jasmine.SpyObj<ChimeService>;
  let router: jasmine.SpyObj<Router>;
  let title: Title;
  let stopUnlock: jasmine.Spy;
  let snackAction: Subject<void>;
  /** What the next poll(s) of GET /admin/help-requests return. */
  let responses: Observable<HelpRequest[]>[];

  beforeEach(() => {
    responses = [];
    service = jasmine.createSpyObj<HelpRequestService>('HelpRequestService', ['getOpen', 'setStatus', 'markDone']);
    service.getOpen.and.callFake(() => responses.shift() ?? of([]));
    snackAction = new Subject<void>();
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    snackBar.open.and.returnValue({ onAction: () => snackAction } as unknown as MatSnackBarRef<TextOnlySnackBar>);
    stopUnlock = jasmine.createSpy('stopUnlock');
    chime = jasmine.createSpyObj<ChimeService>('ChimeService', ['play', 'armUnlock']);
    chime.armUnlock.and.returnValue(stopUnlock);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: HelpRequestService, useValue: service },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: ChimeService, useValue: chime },
        { provide: Router, useValue: router },
      ],
    });
    title = TestBed.inject(Title);
    title.setTitle('UREC Live Admin');
    store = TestBed.inject(HelpRequestStore);
  });

  afterEach(() => store.stop());

  /** Starts polling and lets the first (immediate) load through. */
  function start(...polls: HelpRequest[][]): void {
    responses.push(...polls.map((list) => of(list)));
    store.start();
    tick();
  }

  it('loads the queue straight away, silently', fakeAsync(() => {
    start([helpRequest(1), helpRequest(2)]);

    expect(store.loaded()).toBeTrue();
    expect(store.requests().map((r) => r.id)).toEqual([1, 2]);
    // Requests already waiting at sign-in don't ring
    expect(snackBar.open).not.toHaveBeenCalled();
    expect(chime.play).not.toHaveBeenCalled();
    discardPeriodicTasks();
  }));

  it(`polls every ${HELP_POLL_MS / 1000} s and announces each new request once`, fakeAsync(() => {
    start([helpRequest(1)], [helpRequest(1), helpRequest(2)], [helpRequest(1), helpRequest(2)]);

    tick(HELP_POLL_MS);
    expect(service.getOpen).toHaveBeenCalledTimes(2);
    expect(snackBar.open).toHaveBeenCalledOnceWith('New help request · Leg Press 2 (LP02)', 'View', { duration: 8000 });
    expect(chime.play).toHaveBeenCalledTimes(1);

    tick(HELP_POLL_MS); // same list again: no repeat
    expect(service.getOpen).toHaveBeenCalledTimes(3);
    expect(snackBar.open).toHaveBeenCalledTimes(1);
    expect(chime.play).toHaveBeenCalledTimes(1);
    discardPeriodicTasks();
  }));

  it('groups several arrivals into one toast', fakeAsync(() => {
    start([], [helpRequest(1), helpRequest(2, 'REQUEST_RECEIVED', { equipmentCode: null })]);

    tick(HELP_POLL_MS);

    expect(snackBar.open).toHaveBeenCalledOnceWith('2 new help requests', 'View', { duration: 8000 });
    expect(chime.play).toHaveBeenCalledTimes(1);
    discardPeriodicTasks();
  }));

  it('leaves out a missing machine code', fakeAsync(() => {
    start([], [helpRequest(3, 'REQUEST_RECEIVED', { equipmentCode: null })]);

    tick(HELP_POLL_MS);

    expect(snackBar.open).toHaveBeenCalledOnceWith('New help request · Leg Press 3', 'View', { duration: 8000 });
    discardPeriodicTasks();
  }));

  it("opens the Help Requests page from the toast's View button", fakeAsync(() => {
    start([], [helpRequest(1)]);
    tick(HELP_POLL_MS);

    snackAction.next();

    expect(router.navigate).toHaveBeenCalledWith(['/help-requests']);
    discardPeriodicTasks();
  }));

  it('keeps polling after a failed request', fakeAsync(() => {
    responses.push(of([helpRequest(1)]), throwError(() => new Error('offline')), of([helpRequest(1), helpRequest(2)]));
    store.start();
    tick();

    tick(HELP_POLL_MS); // fails: the last good list stays
    expect(store.requests().map((r) => r.id)).toEqual([1]);

    tick(HELP_POLL_MS);
    expect(store.requests().map((r) => r.id)).toEqual([1, 2]);
    expect(chime.play).toHaveBeenCalledTimes(1);
    discardPeriodicTasks();
  }));

  it('counts members still waiting for staff (new and Too busy)', fakeAsync(() => {
    start([helpRequest(1), helpRequest(2, 'TOO_BUSY'), helpRequest(3, 'ON_THE_WAY')]);

    expect(store.needsStaffCount()).toBe(2);
    discardPeriodicTasks();
  }));

  it('shows the waiting count in the tab title', fakeAsync(() => {
    start([helpRequest(1), helpRequest(2, 'TOO_BUSY')], [helpRequest(3, 'ON_THE_WAY')]);
    expect(title.getTitle()).toBe('(2) UREC Live Admin');

    tick(HELP_POLL_MS);
    expect(title.getTitle()).toBe('UREC Live Admin');
    discardPeriodicTasks();
  }));

  it('updates a request in place after a staff response', fakeAsync(() => {
    start([helpRequest(1), helpRequest(2)]);
    service.setStatus.and.returnValue(of(helpRequest(1, 'ON_THE_WAY', { staffUsername: 'urecadmin' })));

    store.setStatus(1, 'ON_THE_WAY').subscribe();

    expect(service.setStatus).toHaveBeenCalledOnceWith(1, 'ON_THE_WAY');
    expect(store.requests()[0]).toEqual(jasmine.objectContaining({ id: 1, status: 'ON_THE_WAY', staffUsername: 'urecadmin' }));
    expect(store.requests().length).toBe(2);
    expect(title.getTitle()).toBe('(1) UREC Live Admin');
    discardPeriodicTasks();
  }));

  it('drops a request once staff are done helping', fakeAsync(() => {
    start([helpRequest(1), helpRequest(2)]);
    service.markDone.and.returnValue(of(helpRequest(1, 'RESOLVED')));

    store.markDone(1).subscribe();

    expect(store.requests().map((r) => r.id)).toEqual([2]);
    expect(title.getTitle()).toBe('(1) UREC Live Admin');
    discardPeriodicTasks();
  }));

  it('keeps the list when a save fails', fakeAsync(() => {
    start([helpRequest(1)]);
    service.markDone.and.returnValue(throwError(() => new Error('409')));

    store.markDone(1).subscribe({ error: () => {} });

    expect(store.requests().map((r) => r.id)).toEqual([1]);
    discardPeriodicTasks();
  }));

  it('refreshes on demand without announcing what it finds', fakeAsync(() => {
    start([helpRequest(1)]);
    responses.push(of([]));

    store.refresh();

    expect(store.requests()).toEqual([]);
    expect(chime.play).not.toHaveBeenCalled();
    discardPeriodicTasks();
  }));

  it('starts only once', fakeAsync(() => {
    start([helpRequest(1)]);

    store.start();
    tick();

    expect(service.getOpen).toHaveBeenCalledTimes(1);
    expect(chime.armUnlock).toHaveBeenCalledTimes(1);
    discardPeriodicTasks();
  }));

  it('stops polling and resets on stop()', fakeAsync(() => {
    start([helpRequest(1)]);

    store.stop();
    tick(HELP_POLL_MS * 3);

    expect(service.getOpen).toHaveBeenCalledTimes(1);
    expect(stopUnlock).toHaveBeenCalled();
    expect(store.requests()).toEqual([]);
    expect(store.loaded()).toBeFalse();
    expect(title.getTitle()).toBe('UREC Live Admin');
  }));

  it('treats the first load after signing in again as a fresh baseline', fakeAsync(() => {
    start([helpRequest(1)]);
    store.stop();

    responses.push(of([helpRequest(1), helpRequest(2)]));
    store.start();
    tick();

    expect(store.requests().length).toBe(2);
    expect(chime.play).not.toHaveBeenCalled();
    discardPeriodicTasks();
  }));
});
