import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { WritableSignal, computed, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, of, throwError } from 'rxjs';
import { HelpRequest, HelpRequestStatus, needsStaff } from '../../core/models/help-request.model';
import { HelpRequestStore } from '../../core/services/help-request-store.service';
import { HelpRequestService } from '../../core/services/help-request.service';
import { ChimeService } from '../../core/services/chime.service';
import { CLOCK_TICK_MS, HISTORY_LIMIT, HelpRequestsComponent, formatDuration } from './help-requests.component';

const MINUTE = 60_000;
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * MINUTE).toISOString();

function helpRequest(id: number, status: HelpRequestStatus, overrides: Partial<HelpRequest> = {}): HelpRequest {
  return {
    id,
    status,
    equipmentId: 10 + id,
    equipmentCode: `LP0${id}`,
    equipmentName: `Leg Press ${id}`,
    floorLabel: 'Floor 1',
    exerciseName: 'Leg Press',
    memberUsername: `member${id}`,
    staffUsername: null,
    createdAt: minutesAgo(id),
    updatedAt: minutesAgo(id),
    firstResponseAt: null,
    closedAt: null,
    closedBy: null,
    ...overrides,
  };
}

const httpError = (status: number) => new HttpErrorResponse({ status });

describe('HelpRequestsComponent', () => {
  let fixture: ComponentFixture<HelpRequestsComponent>;
  let component: HelpRequestsComponent;
  let requests: WritableSignal<HelpRequest[]>;
  let loaded: WritableSignal<boolean>;
  let muted: WritableSignal<boolean>;
  let store: jasmine.SpyObj<HelpRequestStore>;
  let service: jasmine.SpyObj<HelpRequestService>;
  let chime: jasmine.SpyObj<ChimeService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    requests = signal<HelpRequest[]>([]);
    loaded = signal(true);
    muted = signal(false);
    store = jasmine.createSpyObj<HelpRequestStore>('HelpRequestStore', ['setStatus', 'markDone', 'refresh'], {
      requests,
      loaded,
      needsStaffCount: computed(() => requests().filter(needsStaff).length),
    });
    service = jasmine.createSpyObj<HelpRequestService>('HelpRequestService', ['getHistory']);
    service.getHistory.and.returnValue(of([]));
    chime = jasmine.createSpyObj<ChimeService>('ChimeService', ['setMuted', 'unlock', 'play'], { muted });
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [HelpRequestsComponent],
      providers: [
        provideNoopAnimations(),
        { provide: HelpRequestStore, useValue: store },
        { provide: HelpRequestService, useValue: service },
        { provide: ChimeService, useValue: chime },
      ],
    })
      // MatSnackBarModule provides its own MatSnackBar, so override it everywhere
      .overrideProvider(MatSnackBar, { useValue: snackBar })
      .compileComponents();
  });

  function render(list: HelpRequest[] = []): void {
    requests.set(list);
    fixture = TestBed.createComponent(HelpRequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const byTestId = (id: string, root: ParentNode = el()) => root.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  const text = (id: string, root?: ParentNode) => byTestId(id, root)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const card = (id: number) => byTestId(`request-${id}`)!;
  const button = (id: number, action: 'on-the-way' | 'too-busy' | 'done') =>
    byTestId(action, card(id)) as HTMLButtonElement;
  const queueIds = () =>
    Array.from(el().querySelectorAll('[data-testid^="request-"]')).map((c) => c.getAttribute('data-testid'));

  // ── The queue ─────────────────────────────────────────────────────────────

  it('lists open requests longest-waiting first', () => {
    render([helpRequest(2, 'ON_THE_WAY'), helpRequest(5, 'REQUEST_RECEIVED'), helpRequest(1, 'TOO_BUSY')]);

    expect(queueIds()).toEqual(['request-5', 'request-2', 'request-1']);
  });

  it('shows the machine, member, exercise, floor and status of each request', () => {
    render([helpRequest(3, 'REQUEST_RECEIVED')]);

    expect(card(3).textContent).toContain('Leg Press 3');
    expect(card(3).textContent).toContain('LP03');
    expect(text('status', card(3))).toBe('Request received');
    expect(text('details', card(3))).toBe('member3 · Leg Press · Floor 1');
  });

  it('leaves out details it does not have', () => {
    render([helpRequest(3, 'REQUEST_RECEIVED', { exerciseName: null, floorLabel: null, equipmentCode: null })]);

    expect(text('details', card(3))).toBe('member3');
    expect(card(3).textContent).not.toContain('LP03');
  });

  it('shows who is on the way', () => {
    render([
      helpRequest(1, 'ON_THE_WAY', { staffUsername: 'urecadmin' }),
      helpRequest(2, 'TOO_BUSY', { staffUsername: 'urecadmin' }),
    ]);

    expect(text('responder', card(1))).toBe('urecadmin is on the way');
    expect(byTestId('responder', card(2))).toBeNull();
    expect(text('status', card(2))).toBe('Too busy');
  });

  it('counts new, on the way and too busy requests', () => {
    render([
      helpRequest(1, 'REQUEST_RECEIVED'),
      helpRequest(2, 'REQUEST_RECEIVED'),
      helpRequest(3, 'ON_THE_WAY'),
      helpRequest(4, 'TOO_BUSY'),
    ]);

    expect(text('stat-new')).toContain('2');
    expect(text('stat-new')).toContain('New');
    expect(text('stat-on-the-way')).toContain('1');
    expect(text('stat-too-busy')).toContain('1');
  });

  it('updates as the store polls', () => {
    render([helpRequest(1, 'REQUEST_RECEIVED')]);

    requests.set([helpRequest(1, 'ON_THE_WAY', { staffUsername: 'urecadmin' }), helpRequest(2, 'REQUEST_RECEIVED')]);
    fixture.detectChanges();

    expect(queueIds()).toEqual(['request-2', 'request-1']);
    expect(text('status', card(1))).toBe('On the way');
  });

  it('shows a spinner until the first load, then an empty state', () => {
    loaded.set(false);
    render();
    expect(byTestId('loading')).not.toBeNull();
    expect(byTestId('empty-queue')).toBeNull();

    loaded.set(true);
    fixture.detectChanges();
    expect(byTestId('loading')).toBeNull();
    expect(text('empty-queue')).toContain('No one needs help right now');
  });

  it('keeps the waiting times ticking', fakeAsync(() => {
    render([helpRequest(1, 'REQUEST_RECEIVED', { createdAt: new Date(Date.now() - 30_000).toISOString() })]);
    expect(text('waiting', card(1))).toBe('Waiting less than a minute');

    tick(CLOCK_TICK_MS * 2);
    fixture.detectChanges();
    expect(text('waiting', card(1))).toBe('Waiting 1 min');

    fixture.destroy(); // stops the clock
  }));

  // ── Staff actions ─────────────────────────────────────────────────────────

  it('marks a request On the way', () => {
    store.setStatus.and.returnValue(of(helpRequest(1, 'ON_THE_WAY')));
    render([helpRequest(1, 'REQUEST_RECEIVED')]);

    button(1, 'on-the-way').click();

    expect(store.setStatus).toHaveBeenCalledOnceWith(1, 'ON_THE_WAY');
    expect(snackBar.open).toHaveBeenCalledOnceWith('Marked On the way', undefined, { duration: 2500 });
  });

  it('marks a request Too busy', () => {
    store.setStatus.and.returnValue(of(helpRequest(1, 'TOO_BUSY')));
    render([helpRequest(1, 'REQUEST_RECEIVED')]);

    button(1, 'too-busy').click();

    expect(store.setStatus).toHaveBeenCalledOnceWith(1, 'TOO_BUSY');
    expect(snackBar.open).toHaveBeenCalledOnceWith('Marked Too busy', undefined, { duration: 2500 });
  });

  it('closes a request with Done helping', () => {
    store.markDone.and.returnValue(of(helpRequest(1, 'RESOLVED')));
    render([helpRequest(1, 'ON_THE_WAY')]);

    button(1, 'done').click();

    expect(store.markDone).toHaveBeenCalledOnceWith(1);
    expect(snackBar.open).toHaveBeenCalledOnceWith('Marked done helping', undefined, { duration: 2500 });
  });

  it("disables a request's buttons while it saves, leaving the others usable", () => {
    const pending = new Subject<HelpRequest>();
    store.setStatus.and.returnValue(pending);
    render([helpRequest(1, 'REQUEST_RECEIVED'), helpRequest(2, 'REQUEST_RECEIVED')]);

    button(1, 'on-the-way').click();
    fixture.detectChanges();

    expect(button(1, 'on-the-way').disabled).toBeTrue();
    expect(button(1, 'too-busy').disabled).toBeTrue();
    expect(button(1, 'done').disabled).toBeTrue();
    expect(button(2, 'on-the-way').disabled).toBeFalse();

    pending.next(helpRequest(1, 'ON_THE_WAY'));
    pending.complete();
    fixture.detectChanges();
    expect(button(1, 'done').disabled).toBeFalse();
  });

  it('re-enables the buttons when a save fails', () => {
    store.markDone.and.returnValue(throwError(() => httpError(500)));
    render([helpRequest(1, 'REQUEST_RECEIVED')]);

    button(1, 'done').click();
    fixture.detectChanges();

    expect(button(1, 'done').disabled).toBeFalse();
    expect(snackBar.open).toHaveBeenCalledOnceWith('Failed to update the request', 'Dismiss', { duration: 3000 });
    expect(store.refresh).not.toHaveBeenCalled();
  });

  for (const status of [409, 404]) {
    it(`explains a ${status} (already closed by the member or another staff member) and refreshes`, () => {
      store.setStatus.and.returnValue(throwError(() => httpError(status)));
      render([helpRequest(1, 'REQUEST_RECEIVED')]);

      button(1, 'on-the-way').click();

      expect(snackBar.open).toHaveBeenCalledOnceWith('This request was already closed or changed', 'Dismiss', {
        duration: 3000,
      });
      expect(store.refresh).toHaveBeenCalledTimes(1);
    });
  }

  // ── Recently closed ───────────────────────────────────────────────────────

  it('loads recently closed requests when asked', () => {
    service.getHistory.and.returnValue(
      of([
        helpRequest(1, 'RESOLVED', {
          closedBy: 'STAFF',
          createdAt: minutesAgo(20),
          firstResponseAt: minutesAgo(17),
          closedAt: minutesAgo(5),
        }),
        helpRequest(2, 'RESOLVED', { closedBy: 'MEMBER', closedAt: minutesAgo(6) }),
        helpRequest(3, 'CANCELLED', { closedBy: 'MEMBER', closedAt: minutesAgo(7) }),
        helpRequest(4, 'EXPIRED', { closedBy: 'SYSTEM', closedAt: minutesAgo(8) }),
      ]),
    );
    render();
    expect(byTestId('history')).toBeNull();

    byTestId('history-toggle')!.click();
    fixture.detectChanges();

    expect(service.getHistory).toHaveBeenCalledOnceWith(HISTORY_LIMIT);
    const rows = Array.from(byTestId('history')!.querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent!.trim()),
    );
    expect(rows.map((cells) => cells.slice(0, 4))).toEqual([
      ['Leg Press 1', 'member1', 'Done helping', '3 min'],
      ['Leg Press 2', 'member2', 'Member got help', 'No staff response'],
      ['Leg Press 3', 'member3', 'Cancelled by member', 'No staff response'],
      ['Leg Press 4', 'member4', 'Expired', 'No staff response'],
    ]);
    expect(text('history-toggle')).toContain('Hide recently closed');
  });

  it('says when nothing has been closed yet, and hides the list again', () => {
    render();

    byTestId('history-toggle')!.click();
    fixture.detectChanges();
    expect(byTestId('history-empty')).not.toBeNull();

    byTestId('history-toggle')!.click();
    fixture.detectChanges();
    expect(byTestId('history-empty')).toBeNull();
    expect(service.getHistory).toHaveBeenCalledTimes(1);
  });

  it('reports a failed history load', () => {
    service.getHistory.and.returnValue(throwError(() => httpError(500)));
    render();

    byTestId('history-toggle')!.click();
    fixture.detectChanges();

    expect(snackBar.open).toHaveBeenCalledOnceWith('Failed to load recently closed requests', 'Dismiss', {
      duration: 3000,
    });
    expect(component.historyLoading()).toBeFalse();
  });

  it('reloads the closed list after Done helping while it is open', () => {
    store.markDone.and.returnValue(of(helpRequest(1, 'RESOLVED')));
    render([helpRequest(1, 'ON_THE_WAY')]);
    byTestId('history-toggle')!.click();
    fixture.detectChanges();

    button(1, 'done').click();

    expect(service.getHistory).toHaveBeenCalledTimes(2);
  });

  it("doesn't load the closed list after Done helping while it is hidden", () => {
    store.markDone.and.returnValue(of(helpRequest(1, 'RESOLVED')));
    render([helpRequest(1, 'ON_THE_WAY')]);

    button(1, 'done').click();

    expect(service.getHistory).not.toHaveBeenCalled();
  });

  // ── Sound ─────────────────────────────────────────────────────────────────

  it('mutes the chime', () => {
    render();

    component.setSound(false);

    expect(chime.setMuted).toHaveBeenCalledOnceWith(true);
    expect(chime.play).not.toHaveBeenCalled();
  });

  it('plays the chime when sound is turned back on', () => {
    muted.set(true);
    render();
    const toggle = byTestId('sound-toggle')!.querySelector('button')!;
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    toggle.click();

    expect(chime.setMuted).toHaveBeenCalledOnceWith(false);
    expect(chime.unlock).toHaveBeenCalled();
    expect(chime.play).toHaveBeenCalledTimes(1);
  });
});

describe('formatDuration', () => {
  it('rounds down to whole minutes', () => {
    expect(formatDuration(0)).toBe('less than a minute');
    expect(formatDuration(59_999)).toBe('less than a minute');
    expect(formatDuration(MINUTE)).toBe('1 min');
    expect(formatDuration(59 * MINUTE + 59_999)).toBe('59 min');
  });

  it('switches to hours after an hour', () => {
    expect(formatDuration(60 * MINUTE)).toBe('1 h 0 min');
    expect(formatDuration(125 * MINUTE)).toBe('2 h 5 min');
  });

  it('treats clock skew (a negative duration) as just now', () => {
    expect(formatDuration(-5 * MINUTE)).toBe('less than a minute');
  });
});
