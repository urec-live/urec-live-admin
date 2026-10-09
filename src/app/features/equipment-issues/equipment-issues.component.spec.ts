import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subject, of, throwError } from 'rxjs';
import { EquipmentIssueService } from '../../core/services/equipment-issue.service';
import { EquipmentIssueStore } from '../../core/services/equipment-issue-store.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  EquipmentIssueGroup,
  EquipmentIssueReport,
  EquipmentIssueSummary,
} from '../../core/models/equipment-issue.model';
import { AUTO_REFRESH_MS, EquipmentIssuesComponent } from './equipment-issues.component';

const NOW = new Date().toISOString();
const SUMMARY: EquipmentIssueSummary = {
  reported: 1, acknowledged: 1, inProgress: 1, affectedMachines: 2, outOfOrderMachines: 1,
};

function report(overrides: Partial<EquipmentIssueReport>): EquipmentIssueReport {
  return {
    id: 1,
    equipmentId: 10,
    equipmentName: 'Leg Press',
    equipmentCode: 'LP01',
    severity: 'DAMAGED',
    description: 'Seat padding is torn',
    status: 'REPORTED',
    reporterUsername: 'jdoe',
    reportedAt: NOW,
    updatedAt: NOW,
    resolvedAt: null,
    ...overrides,
  };
}

/**
 * Leg Press: one new not-working report + one acknowledged damage report. Treadmill: one repair in
 * progress. Both machines are Available unless a status is given.
 */
function groups(machineStatus: { legPress?: string; treadmill?: string } = {}): EquipmentIssueGroup[] {
  return [
    {
      equipmentId: 10,
      equipmentName: 'Leg Press',
      equipmentCode: 'LP01',
      equipmentStatus: machineStatus.legPress ?? 'Available',
      openReportCount: 2,
      worstSeverity: 'OUT_OF_ORDER',
      latestReportedAt: NOW,
      reports: [
        report({ id: 1, severity: 'OUT_OF_ORDER', status: 'REPORTED', description: 'Cable snapped, stack will not lift' }),
        report({ id: 2, severity: 'DAMAGED', status: 'ACKNOWLEDGED', reporterUsername: 'asmith' }),
      ],
    },
    {
      equipmentId: 11,
      equipmentName: 'Treadmill 3',
      equipmentCode: 'TM03',
      equipmentStatus: machineStatus.treadmill ?? 'Available',
      openReportCount: 1,
      worstSeverity: 'DAMAGED',
      latestReportedAt: NOW,
      reports: [
        report({
          id: 3, equipmentId: 11, equipmentName: 'Treadmill 3', equipmentCode: 'TM03',
          status: 'IN_PROGRESS', description: 'Belt slips at high speed',
        }),
      ],
    },
  ];
}

describe('EquipmentIssuesComponent', () => {
  let fixture: ComponentFixture<EquipmentIssuesComponent>;
  let component: EquipmentIssuesComponent;
  let service: jasmine.SpyObj<EquipmentIssueService>;
  let summary: WritableSignal<EquipmentIssueSummary | null>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let dialog: jasmine.SpyObj<MatDialog>;
  /** What the next confirmation dialog answers: true = the admin confirms, false = Cancel. */
  let confirmNext: boolean;
  let arrivals: Subject<EquipmentIssueReport[]>;

  beforeEach(async () => {
    confirmNext = true;
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.callFake(
      () => ({ afterClosed: () => of(confirmNext) }) as unknown as MatDialogRef<ConfirmDialogComponent>,
    );
    arrivals = new Subject<EquipmentIssueReport[]>();
    summary = signal<EquipmentIssueSummary | null>(null);
    service = jasmine.createSpyObj<EquipmentIssueService>(
      'EquipmentIssueService',
      ['getGrouped', 'loadSummary', 'updateStatus', 'updateMachineStatus', 'setOutOfOrder'],
      { summary },
    );
    service.getGrouped.and.callFake(() => of(groups()));
    service.loadSummary.and.callFake(() => {
      summary.set(SUMMARY);
      return of(SUMMARY);
    });
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [EquipmentIssuesComponent],
      providers: [
        provideNoopAnimations(),
        { provide: EquipmentIssueService, useValue: service },
        { provide: EquipmentIssueStore, useValue: { arrivals$: arrivals.asObservable() } },
      ],
    })
      // MatSnackBarModule provides its own MatSnackBar, so override it everywhere
      .overrideProvider(MatSnackBar, { useValue: snackBar })
      .overrideProvider(MatDialog, { useValue: dialog })
      .compileComponents();
  });

  function render(autoRefresh = false): void {
    fixture = TestBed.createComponent(EquipmentIssuesComponent);
    component = fixture.componentInstance;
    component.autoRefresh = autoRefresh;
    fixture.detectChanges();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const text = (selector: string): string => el().querySelector(selector)?.textContent?.trim() ?? '';
  const panels = (): NodeListOf<HTMLElement> => el().querySelectorAll('mat-expansion-panel');
  const toggleButtons = (testId: string): HTMLButtonElement[] =>
    Array.from(el().querySelectorAll<HTMLButtonElement>(`[data-testid="${testId}"] .mat-button-toggle-button`));

  it('loads open issues and the summary on start', () => {
    render();

    expect(service.getGrouped).toHaveBeenCalledOnceWith(false);
    expect(service.loadSummary).toHaveBeenCalledTimes(1);
    expect(text('[data-testid="stat-reported"]')).toBe('1');
    expect(text('[data-testid="stat-acknowledged"]')).toBe('1');
    expect(text('[data-testid="stat-in-progress"]')).toBe('1');
    expect(text('[data-testid="stat-machines"]')).toBe('2');
  });

  it('lists one panel per machine with its worst severity and open report count', () => {
    render();

    expect(panels().length).toBe(2);
    const legPress = text('[data-testid="machine-10"] mat-expansion-panel-header');
    expect(legPress).toContain('Leg Press');
    expect(legPress).toContain('LP01');
    expect(legPress).toContain('Not working');
    expect(legPress).toContain('2 open reports');
    expect(text('[data-testid="machine-11"] mat-expansion-panel-header')).toContain('1 open report');
  });

  it('shows every report with its reporter and description', () => {
    render();

    const first = text('[data-testid="report-1"]');
    expect(first).toContain('jdoe');
    expect(first).toContain('Cable snapped, stack will not lift');
    expect(text('[data-testid="report-2"]')).toContain('asmith');
  });

  it('opens machines that have new reports and leaves the rest closed', () => {
    render();

    expect(el().querySelector('[data-testid="machine-10"]')!.classList).toContain('mat-expanded');
    expect(el().querySelector('[data-testid="machine-11"]')!.classList).not.toContain('mat-expanded');
  });

  it('filters machines by name or code', () => {
    render();

    component.search.set('tm03');
    fixture.detectChanges();
    expect(panels().length).toBe(1);
    expect(text('[data-testid="machine-11"]')).toContain('Treadmill 3');

    component.search.set('nothing like this');
    fixture.detectChanges();
    expect(panels().length).toBe(0);
    expect(text('[data-testid="empty-state"]')).toContain('No machines match your filters');
  });

  it('filters machines by severity', () => {
    render();

    component.severityFilter.set('OUT_OF_ORDER');
    fixture.detectChanges();

    expect(panels().length).toBe(1);
    expect(text('[data-testid="machine-10"]')).toContain('Leg Press');
  });

  it('shows an empty state when nothing is open', () => {
    service.getGrouped.and.returnValue(of([]));
    render();

    expect(panels().length).toBe(0);
    expect(text('[data-testid="empty-state"]')).toContain('No open equipment issues');
  });

  it('reloads including resolved reports when "Show resolved" is turned on', () => {
    render();

    component.showResolved = true;
    component.loadGroups();

    expect(service.getGrouped).toHaveBeenCalledWith(true);
  });

  it('sets a report status from its toggle and refreshes the counts', () => {
    service.updateStatus.and.callFake((id, status) => of(report({ id, severity: 'OUT_OF_ORDER', status })));
    render();

    // Toggles are New | Acknowledged | Repairing | Resolved
    toggleButtons('report-1')[1].click();
    fixture.detectChanges();

    expect(service.updateStatus).toHaveBeenCalledOnceWith(1, 'ACKNOWLEDGED');
    expect(component.groups()[0].reports[0].status).toBe('ACKNOWLEDGED');
    expect(service.loadSummary).toHaveBeenCalledTimes(2);
    expect(snackBar.open).toHaveBeenCalledWith('Report marked Acknowledged', undefined, jasmine.any(Object));
  });

  it('puts the toggle back and says so when saving fails', () => {
    service.updateStatus.and.returnValue(throwError(() => new Error('500')));
    render();

    toggleButtons('report-1')[3].click();
    fixture.detectChanges();

    expect(component.groups()[0].reports[0].status).toBe('REPORTED');
    const checked = el().querySelector('[data-testid="report-1"] .mat-button-toggle-checked');
    expect(checked?.textContent?.trim()).toBe('New');
    expect(snackBar.open).toHaveBeenCalledWith('Failed to update status', 'Dismiss', jasmine.any(Object));
    expect(service.loadSummary).toHaveBeenCalledTimes(1);
  });

  it('updates the machine header when its last open report is resolved', () => {
    service.updateStatus.and.callFake((id, status) =>
      of(report({ id, equipmentId: 11, equipmentName: 'Treadmill 3', status, resolvedAt: NOW })));
    render();

    component.onReportStatusChange(component.groups()[1].reports[0], 'RESOLVED');
    fixture.detectChanges();

    const treadmill = component.groups()[1];
    expect(treadmill.openReportCount).toBe(0);
    expect(treadmill.worstSeverity).toBeNull();
    expect(text('[data-testid="machine-11"] mat-expansion-panel-header')).toContain('All resolved');
  });

  it('sets every open report on a machine at once', () => {
    service.updateMachineStatus.and.callFake((equipmentId, status) => {
      const legPress = groups()[0];
      return of({ ...legPress, reports: legPress.reports.map((r) => ({ ...r, status })) });
    });
    render();

    component.onMachineStatusChange(component.groups()[0], 'IN_PROGRESS');
    fixture.detectChanges();

    expect(service.updateMachineStatus).toHaveBeenCalledOnceWith(10, 'IN_PROGRESS');
    expect(component.groups()[0].reports.map((r) => r.status)).toEqual(['IN_PROGRESS', 'IN_PROGRESS']);
    expect(component.machineStatus(component.groups()[0])).toBe('IN_PROGRESS');
    // Other machines are untouched
    expect(component.groups()[1].reports[0].status).toBe('IN_PROGRESS');
    expect(service.loadSummary).toHaveBeenCalledTimes(2);
  });

  it('restores each report when a machine-wide change fails', () => {
    service.updateMachineStatus.and.returnValue(throwError(() => new Error('500')));
    render();

    component.onMachineStatusChange(component.groups()[0], 'RESOLVED');
    fixture.detectChanges();

    expect(component.groups()[0].reports.map((r) => r.status)).toEqual(['REPORTED', 'ACKNOWLEDGED']);
    expect(component.groups()[0].openReportCount).toBe(2);
    expect(snackBar.open).toHaveBeenCalledWith('Failed to update status', 'Dismiss', jasmine.any(Object));
  });

  it('puts the machine-wide toggle back when saving fails', () => {
    service.updateMachineStatus.and.returnValue(throwError(() => new Error('500')));
    render();
    const machineToggle = '[data-testid="machine-10"] [aria-label="Status for all open reports on this machine"]';

    // Leg Press's open reports disagree (New + Acknowledged), so nothing starts selected
    expect(el().querySelector(`${machineToggle} .mat-button-toggle-checked`)).toBeNull();
    el().querySelectorAll<HTMLButtonElement>(`${machineToggle} .mat-button-toggle-button`)[2].click(); // Repairing
    fixture.detectChanges();

    expect(service.updateMachineStatus).toHaveBeenCalledOnceWith(10, 'IN_PROGRESS');
    expect(el().querySelector(`${machineToggle} .mat-button-toggle-checked`)).toBeNull();
    expect(component.groups()[0].reports.map((r) => r.status)).toEqual(['REPORTED', 'ACKNOWLEDGED']);
  });

  it('only shows a shared machine status when all open reports agree', () => {
    render();

    expect(component.machineStatus(component.groups()[0])).toBeNull(); // REPORTED + ACKNOWLEDGED
    expect(component.machineStatus(component.groups()[1])).toBe('IN_PROGRESS');
  });

  // ── Confirmations ─────────────────────────────────────────────────────────

  const machineToggle = (equipmentId: number): string =>
    `[data-testid="machine-${equipmentId}"] [aria-label="Status for all open reports on this machine"]`;
  const machineToggleButtons = (equipmentId: number): HTMLButtonElement[] =>
    Array.from(el().querySelectorAll<HTMLButtonElement>(`${machineToggle(equipmentId)} .mat-button-toggle-button`));
  const lastDialog = (): ConfirmDialogData =>
    dialog.open.calls.mostRecent().args[1]?.data as ConfirmDialogData;

  it('asks before setting all open reports on a machine, and Cancel changes nothing', () => {
    confirmNext = false;
    render();

    machineToggleButtons(10)[2].click(); // Repairing
    fixture.detectChanges();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(lastDialog()).toEqual({
      title: 'Are you sure?',
      message: 'This sets all 2 open reports on Leg Press to Repairing.',
      confirmLabel: 'Yes, set all to Repairing',
    });
    expect(service.updateMachineStatus).not.toHaveBeenCalled();
    expect(component.groups()[0].reports.map((r) => r.status)).toEqual(['REPORTED', 'ACKNOWLEDGED']);
    // The reports still disagree, so the machine-wide toggle goes back to showing nothing
    expect(el().querySelector(`${machineToggle(10)} .mat-button-toggle-checked`)).toBeNull();
  });

  it('sets all open reports once the admin confirms', () => {
    service.updateMachineStatus.and.callFake((equipmentId, status) => {
      const legPress = groups()[0];
      return of({ ...legPress, reports: legPress.reports.map((r) => ({ ...r, status })) });
    });
    render();

    machineToggleButtons(10)[1].click(); // Acknowledged
    fixture.detectChanges();

    expect(service.updateMachineStatus).toHaveBeenCalledOnceWith(10, 'ACKNOWLEDGED');
    expect(component.groups()[0].reports.map((r) => r.status)).toEqual(['ACKNOWLEDGED', 'ACKNOWLEDGED']);
  });

  it('asks before resolving everything on a machine, and says it goes back in service', () => {
    confirmNext = false;
    service.getGrouped.and.returnValue(of(groups({ legPress: 'Out of Order' })));
    render();

    component.onMachineStatusChange(component.groups()[0], 'RESOLVED');

    expect(lastDialog()).toEqual({
      title: 'Are you sure?',
      message: 'This resolves all 2 open reports on Leg Press. Members will see them as Fixed.'
        + ' Leg Press goes back in service.',
      confirmLabel: 'Yes, resolve all',
    });
    expect(service.updateMachineStatus).not.toHaveBeenCalled();
  });

  it('asks before resolving a single report, and Cancel puts the toggle back', () => {
    confirmNext = false;
    render();

    toggleButtons('report-1')[3].click(); // Resolved
    fixture.detectChanges();

    expect(lastDialog()).toEqual({
      title: 'Are you sure?',
      message: "This resolves jdoe's report on Leg Press. They'll see it as Fixed.",
      confirmLabel: 'Yes, resolve',
    });
    expect(service.updateStatus).not.toHaveBeenCalled();
    expect(text('[data-testid="report-1"] .mat-button-toggle-checked')).toBe('New');
  });

  it('resolves a single report once the admin confirms', () => {
    service.updateStatus.and.callFake((id, status) =>
      of(report({ id, severity: 'OUT_OF_ORDER', status, resolvedAt: NOW })));
    render();

    toggleButtons('report-1')[3].click(); // Resolved
    fixture.detectChanges();

    expect(service.updateStatus).toHaveBeenCalledOnceWith(1, 'RESOLVED');
    expect(component.groups()[0].reports[0].status).toBe('RESOLVED');
  });

  it('warns when resolving the last open report puts an out-of-order machine back in service', () => {
    confirmNext = false;
    service.getGrouped.and.returnValue(of(groups({ treadmill: 'Out of Order' })));
    render();

    component.onReportStatusChange(component.groups()[1].reports[0], 'RESOLVED');

    expect(lastDialog().message).toBe(
      "This resolves jdoe's report on Treadmill 3. They'll see it as Fixed. Treadmill 3 goes back in service.");
  });

  it("doesn't ask for other single-report changes", () => {
    service.updateStatus.and.callFake((id, status) => of(report({ id, status })));
    render();

    toggleButtons('report-1')[1].click(); // Acknowledged
    fixture.detectChanges();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(service.updateStatus).toHaveBeenCalledOnceWith(1, 'ACKNOWLEDGED');
  });

  // ── Live updates ──────────────────────────────────────────────────────────

  it('shows a newly filed report right away instead of waiting for auto-refresh', () => {
    render();
    expect(service.getGrouped).toHaveBeenCalledTimes(1);

    arrivals.next([report({ id: 9 })]);

    expect(service.getGrouped).toHaveBeenCalledTimes(2);
  });

  // ── Out of order ──────────────────────────────────────────────────────────

  const outOfOrderSwitch = (equipmentId: number): HTMLButtonElement =>
    el().querySelector<HTMLButtonElement>(`[data-testid="out-of-order-toggle-${equipmentId}"] button[role="switch"]`)!;
  const outOfOrderChip = (equipmentId: number): Element | null =>
    el().querySelector(`[data-testid="machine-${equipmentId}"] [data-testid="out-of-order-chip"]`);

  it('shows how many machines are out of order under "Machines affected"', () => {
    render();
    expect(text('[data-testid="stat-out-of-order"]')).toBe('1 out of order');

    summary.set({ ...SUMMARY, outOfOrderMachines: 0 });
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="stat-out-of-order"]')).toBeNull();
  });

  it('says "Machine affected" for exactly one machine and "Machines affected" otherwise', () => {
    render();
    const label = (): string => text('[data-testid="stat-machines"] + p');
    expect(label()).toBe('Machines affected'); // SUMMARY has 2

    summary.set({ ...SUMMARY, affectedMachines: 1 });
    fixture.detectChanges();
    expect(label()).toBe('Machine affected');

    summary.set({ ...SUMMARY, affectedMachines: 0 });
    fixture.detectChanges();
    expect(label()).toBe('Machines affected');
  });

  it('marks out-of-order machines in their header and switch', () => {
    service.getGrouped.and.returnValue(of(groups({ legPress: 'Out of Order' })));
    render();

    expect(outOfOrderChip(10)).not.toBeNull();
    expect(outOfOrderSwitch(10).getAttribute('aria-checked')).toBe('true');
    expect(outOfOrderChip(11)).toBeNull();
    expect(outOfOrderSwitch(11).getAttribute('aria-checked')).toBe('false');
  });

  it('takes a machine out of service from its switch', () => {
    service.setOutOfOrder.and.returnValue(of({
      id: 11, code: 'TM03', name: 'Treadmill 3', status: 'Out of Order', deleted: false, exercises: [],
    }));
    render();

    outOfOrderSwitch(11).click();
    fixture.detectChanges();

    expect(service.setOutOfOrder).toHaveBeenCalledOnceWith(11, true);
    expect(component.groups()[1].equipmentStatus).toBe('Out of Order');
    expect(outOfOrderChip(11)).not.toBeNull();
    expect(snackBar.open).toHaveBeenCalledWith('Treadmill 3 marked out of order', undefined, jasmine.any(Object));
    expect(service.loadSummary).toHaveBeenCalledTimes(2);
  });

  it('puts the switch back and says so when saving fails', () => {
    service.setOutOfOrder.and.returnValue(throwError(() => new Error('500')));
    render();

    outOfOrderSwitch(11).click();
    fixture.detectChanges();

    expect(outOfOrderSwitch(11).getAttribute('aria-checked')).toBe('false');
    expect(component.groups()[1].equipmentStatus).toBe('Available');
    expect(outOfOrderChip(11)).toBeNull();
    expect(snackBar.open).toHaveBeenCalledWith('Failed to update the machine', 'Dismiss', jasmine.any(Object));
  });

  it('shows a machine back in service once its last open report is resolved', () => {
    service.getGrouped.and.returnValue(of(groups({ treadmill: 'Out of Order' })));
    service.updateStatus.and.callFake((id, status) =>
      of(report({ id, equipmentId: 11, equipmentName: 'Treadmill 3', status, resolvedAt: NOW })));
    render();

    component.onReportStatusChange(component.groups()[1].reports[0], 'RESOLVED');
    fixture.detectChanges();

    expect(component.groups()[1].equipmentStatus).toBe('Available');
    expect(outOfOrderChip(11)).toBeNull();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Report marked Resolved · Treadmill 3 is back in service', undefined, jasmine.any(Object));
  });

  it('keeps a machine out of order while it still has open reports', () => {
    service.getGrouped.and.returnValue(of(groups({ legPress: 'Out of Order' })));
    service.updateStatus.and.callFake((id, status) => of(report({ id, status, resolvedAt: NOW })));
    render();

    component.onReportStatusChange(component.groups()[0].reports[0], 'RESOLVED');
    fixture.detectChanges();

    expect(component.groups()[0].equipmentStatus).toBe('Out of Order');
    expect(snackBar.open).toHaveBeenCalledWith('Report marked Resolved', undefined, jasmine.any(Object));
  });

  it('uses the server status after resolving every open report at once', () => {
    service.getGrouped.and.returnValue(of(groups({ legPress: 'Out of Order' })));
    service.updateMachineStatus.and.callFake((equipmentId, status) => {
      const legPress = groups()[0];
      return of({
        ...legPress,
        equipmentStatus: 'Available',
        openReportCount: 0,
        worstSeverity: null,
        reports: legPress.reports.map((r) => ({ ...r, status })),
      });
    });
    render();

    component.onMachineStatusChange(component.groups()[0], 'RESOLVED');
    fixture.detectChanges();

    expect(component.groups()[0].equipmentStatus).toBe('Available');
    expect(outOfOrderChip(10)).toBeNull();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Open reports on Leg Press marked Resolved · back in service', undefined, jasmine.any(Object));
  });

  it('refreshes every 30 seconds while auto-refresh is on', fakeAsync(() => {
    render(true);
    expect(service.getGrouped).toHaveBeenCalledTimes(1);

    tick(AUTO_REFRESH_MS);
    expect(service.getGrouped).toHaveBeenCalledTimes(2);
    expect(service.loadSummary).toHaveBeenCalledTimes(2);

    component.autoRefresh = false;
    component.toggleAutoRefresh();
    tick(AUTO_REFRESH_MS * 2);
    expect(service.getGrouped).toHaveBeenCalledTimes(2);

    fixture.destroy();
  }));
});
