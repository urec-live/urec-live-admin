import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { Subject, of, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ChatReportService } from './chat-report.service';
import { CHAT_REPORT_POLL_MS, ChatReportStore } from './chat-report-store.service';
import { ChatReportSummary } from '../models/chat-report.model';

describe('ChatReportStore', () => {
  let store: ChatReportStore;
  let service: jasmine.SpyObj<ChatReportService>;
  let summary: WritableSignal<ChatReportSummary | null>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let router: jasmine.SpyObj<Router>;
  let viewClicked: Subject<void>;

  /** Each poll answers with the next summary, publishing it like the real service. */
  function answers(...summaries: ChatReportSummary[]): void {
    service.loadSummary.and.returnValues(
      ...summaries.map((s) => of(s).pipe(tap(() => summary.set(s)))),
    );
  }

  beforeEach(() => {
    summary = signal<ChatReportSummary | null>(null);
    service = jasmine.createSpyObj<ChatReportService>('ChatReportService', ['loadSummary'], { summary });
    viewClicked = new Subject<void>();
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    snackBar.open.and.returnValue(
      { onAction: () => viewClicked.asObservable() } as unknown as MatSnackBarRef<TextOnlySnackBar>,
    );
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: ChatReportService, useValue: service },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: Router, useValue: router },
      ],
    });
    store = TestBed.inject(ChatReportStore);
  });

  it('loads the counts at once and badges the messages awaiting review, quietly the first time', fakeAsync(() => {
    answers({ openMessages: 2, openReports: 3 });

    store.start();

    expect(service.loadSummary).toHaveBeenCalledTimes(1);
    expect(store.openMessages()).toBe(2);
    expect(snackBar.open).not.toHaveBeenCalled();
    store.stop();
  }));

  it('announces new reports, and View opens the page', fakeAsync(() => {
    answers({ openMessages: 1, openReports: 1 }, { openMessages: 2, openReports: 2 }, { openMessages: 2, openReports: 4 });

    store.start();
    tick(CHAT_REPORT_POLL_MS);
    expect(snackBar.open).toHaveBeenCalledOnceWith('A member reported a chat message', 'View', { duration: 8000 });

    viewClicked.next();
    expect(router.navigate).toHaveBeenCalledWith(['/chat-reports']);

    tick(CHAT_REPORT_POLL_MS);
    expect(snackBar.open.calls.mostRecent().args[0]).toBe('2 new chat message reports');
    store.stop();
  }));

  it('stays quiet when reports are resolved', fakeAsync(() => {
    answers({ openMessages: 2, openReports: 3 }, { openMessages: 0, openReports: 0 });
    store.start();
    tick(CHAT_REPORT_POLL_MS);
    expect(snackBar.open).not.toHaveBeenCalled();
    expect(store.openMessages()).toBe(0);
    store.stop();
  }));

  it('skips a failed poll and keeps going', fakeAsync(() => {
    service.loadSummary.and.returnValues(
      throwError(() => new Error('offline')),
      of({ openMessages: 1, openReports: 1 }),
    );
    store.start();
    tick(CHAT_REPORT_POLL_MS);
    expect(service.loadSummary).toHaveBeenCalledTimes(2);
    // The first successful poll after a failure is still the baseline
    expect(snackBar.open).not.toHaveBeenCalled();
    store.stop();
  }));

  it('stops polling on sign-out, and starts only once', fakeAsync(() => {
    service.loadSummary.and.returnValue(of({ openMessages: 0, openReports: 0 }));
    store.start();
    store.start();
    expect(service.loadSummary).toHaveBeenCalledTimes(1);

    store.stop();
    tick(CHAT_REPORT_POLL_MS * 2);
    expect(service.loadSummary).toHaveBeenCalledTimes(1);
  }));

  it("clears the badge on sign-out, so the next admin never sees the last one's count", fakeAsync(() => {
    const lastAdmins: ChatReportSummary = { openMessages: 5, openReports: 5 };
    service.loadSummary.and.returnValues(
      of(lastAdmins).pipe(tap(() => summary.set(lastAdmins))),
      throwError(() => new Error('offline')),
    );
    store.start();
    expect(store.openMessages()).toBe(5);

    store.stop();
    expect(summary()).toBeNull();
    expect(store.openMessages()).toBe(0);

    // The next admin's first poll fails: the badge stays empty rather than showing the old count
    store.start();
    expect(service.loadSummary).toHaveBeenCalledTimes(2);
    expect(store.openMessages()).toBe(0);
    store.stop();
  }));
});
