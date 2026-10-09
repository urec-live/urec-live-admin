import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { Subject, of, throwError } from 'rxjs';
import { EquipmentIssueService } from './equipment-issue.service';
import { EquipmentIssueStore, ISSUE_POLL_MS } from './equipment-issue-store.service';
import {
  EquipmentIssueGroup,
  EquipmentIssueReport,
  EquipmentIssueSummary,
} from '../models/equipment-issue.model';

const NOW = new Date().toISOString();
const SUMMARY: EquipmentIssueSummary = {
  reported: 1, acknowledged: 0, inProgress: 0, affectedMachines: 1, outOfOrderMachines: 0,
};

function report(id: number, overrides: Partial<EquipmentIssueReport> = {}): EquipmentIssueReport {
  return {
    id,
    equipmentId: 10,
    equipmentName: 'Leg Press',
    equipmentCode: 'LP01',
    severity: 'OUT_OF_ORDER',
    description: 'Cable snapped',
    status: 'REPORTED',
    reporterUsername: 'jdoe',
    reportedAt: NOW,
    updatedAt: NOW,
    resolvedAt: null,
    withdrawnAt: null,
    ...overrides,
  };
}

/** The store only looks at the reports, so one group holding them all is enough. */
function groupsOf(...reports: EquipmentIssueReport[]): EquipmentIssueGroup[] {
  return [{
    equipmentId: 10,
    equipmentName: 'Leg Press',
    equipmentCode: 'LP01',
    equipmentStatus: 'Available',
    openReportCount: reports.length,
    worstSeverity: 'OUT_OF_ORDER',
    latestReportedAt: NOW,
    reports,
  }];
}

describe('EquipmentIssueStore', () => {
  let store: EquipmentIssueStore;
  let service: jasmine.SpyObj<EquipmentIssueService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let router: jasmine.SpyObj<Router>;
  let viewClicked: Subject<void>;

  beforeEach(() => {
    service = jasmine.createSpyObj<EquipmentIssueService>('EquipmentIssueService', ['getGrouped', 'loadSummary']);
    service.loadSummary.and.returnValue(of(SUMMARY));
    viewClicked = new Subject<void>();
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    snackBar.open.and.returnValue(
      { onAction: () => viewClicked.asObservable() } as unknown as MatSnackBarRef<TextOnlySnackBar>,
    );
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: EquipmentIssueService, useValue: service },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: Router, useValue: router },
      ],
    });
    store = TestBed.inject(EquipmentIssueStore);
  });

  it('treats the first load as a silent baseline that includes resolved reports', fakeAsync(() => {
    service.getGrouped.and.returnValue(of(groupsOf(report(1), report(2, { status: 'RESOLVED' }))));

    store.start();

    expect(service.getGrouped).toHaveBeenCalledOnceWith(true);
    expect(snackBar.open).not.toHaveBeenCalled();
    store.stop();
  }));

  it('announces a new report with its machine and severity, and View opens the issues page', fakeAsync(() => {
    const arrivals: number[][] = [];
    store.arrivals$.subscribe((reports) => arrivals.push(reports.map((r) => r.id)));
    service.getGrouped.and.returnValues(
      of(groupsOf(report(1))),
      of(groupsOf(report(1), report(2, { equipmentName: 'Treadmill 3', equipmentCode: 'TM03', severity: 'DAMAGED' }))),
    );

    store.start();
    tick(ISSUE_POLL_MS);

    expect(service.getGrouped.calls.mostRecent().args).toEqual([false]);
    expect(snackBar.open).toHaveBeenCalledOnceWith(
      'New equipment issue · Treadmill 3 (TM03) · Damaged', 'View', { duration: 8000 });
    expect(arrivals).toEqual([[2]]);

    viewClicked.next();
    expect(router.navigate).toHaveBeenCalledWith(['/equipment-issues']);
    store.stop();
  }));

  it('counts several new reports in one toast', fakeAsync(() => {
    service.getGrouped.and.returnValues(
      of(groupsOf(report(1))),
      of(groupsOf(report(1), report(2), report(3))),
    );

    store.start();
    tick(ISSUE_POLL_MS);

    expect(snackBar.open).toHaveBeenCalledOnceWith('2 new equipment issues', 'View', { duration: 8000 });
    store.stop();
  }));

  it('does not announce a report an admin reopens', fakeAsync(() => {
    // Report 7 was resolved before sign-in; reopening puts it back on the open list, but it isn't new
    service.getGrouped.and.returnValues(
      of(groupsOf(report(3), report(7, { status: 'RESOLVED' }))),
      of(groupsOf(report(3), report(7, { status: 'IN_PROGRESS' }))),
    );

    store.start();
    tick(ISSUE_POLL_MS);

    expect(snackBar.open).not.toHaveBeenCalled();
    store.stop();
  }));

  it('refreshes the summary on every poll', fakeAsync(() => {
    service.getGrouped.and.returnValue(of([]));

    store.start();
    tick(ISSUE_POLL_MS * 2);

    expect(service.loadSummary).toHaveBeenCalledTimes(3);
    store.stop();
  }));

  it('keeps polling after a failed request and retries the baseline', fakeAsync(() => {
    service.getGrouped.and.returnValues(
      throwError(() => new Error('offline')),
      of(groupsOf(report(1))),
      of(groupsOf(report(1), report(2))),
    );

    store.start();          // the baseline fails
    tick(ISSUE_POLL_MS);    // ...so it's retried, still silently
    expect(service.getGrouped.calls.argsFor(1)).toEqual([true]);
    expect(snackBar.open).not.toHaveBeenCalled();

    tick(ISSUE_POLL_MS);    // report 2 is new
    expect(snackBar.open).toHaveBeenCalledTimes(1);
    store.stop();
  }));

  it('starts once, and stops polling on stop()', fakeAsync(() => {
    service.getGrouped.and.returnValue(of([]));

    store.start();
    store.start();
    expect(service.getGrouped).toHaveBeenCalledTimes(1);

    store.stop();
    tick(ISSUE_POLL_MS * 3);
    expect(service.getGrouped).toHaveBeenCalledTimes(1);
  }));
});
