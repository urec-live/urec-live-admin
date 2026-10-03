import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { EquipmentIssueService } from '../../core/services/equipment-issue.service';
import {
  EquipmentIssueGroup,
  EquipmentIssueReport,
  EquipmentIssueSummary,
} from '../../core/models/equipment-issue.model';
import { AUTO_REFRESH_MS, EquipmentIssuesComponent } from './equipment-issues.component';

const NOW = new Date().toISOString();
const SUMMARY: EquipmentIssueSummary = { reported: 1, acknowledged: 1, inProgress: 1, affectedMachines: 2 };

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

/** Leg Press: one new not-working report + one acknowledged damage report. Treadmill: one repair in progress. */
function groups(): EquipmentIssueGroup[] {
  return [
    {
      equipmentId: 10,
      equipmentName: 'Leg Press',
      equipmentCode: 'LP01',
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

  beforeEach(async () => {
    summary = signal<EquipmentIssueSummary | null>(null);
    service = jasmine.createSpyObj<EquipmentIssueService>(
      'EquipmentIssueService',
      ['getGrouped', 'loadSummary', 'updateStatus', 'updateMachineStatus'],
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
      providers: [provideNoopAnimations(), { provide: EquipmentIssueService, useValue: service }],
    })
      // MatSnackBarModule provides its own MatSnackBar, so override it everywhere
      .overrideProvider(MatSnackBar, { useValue: snackBar })
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
