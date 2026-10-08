import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Subject, of } from 'rxjs';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { EquipmentIssueService } from '../../../core/services/equipment-issue.service';
import { EquipmentIssueStore } from '../../../core/services/equipment-issue-store.service';
import { EquipmentIssueReport, EquipmentIssueSummary } from '../../../core/models/equipment-issue.model';
import { DashboardHomeComponent } from './dashboard-home.component';

const SUMMARY: EquipmentIssueSummary = {
  reported: 0, acknowledged: 0, inProgress: 0, affectedMachines: 1, outOfOrderMachines: 2,
};

describe('DashboardHomeComponent', () => {
  let analytics: jasmine.SpyObj<AnalyticsService>;
  let summary: WritableSignal<EquipmentIssueSummary | null>;
  let arrivals: Subject<EquipmentIssueReport[]>;

  beforeEach(() => {
    analytics = jasmine.createSpyObj<AnalyticsService>(
      'AnalyticsService', ['getLiveSnapshot', 'getActivityLog', 'getUsageStats', 'getPeakHours']);
    analytics.getLiveSnapshot.and.returnValue(of({
      totalMachines: 12, occupiedMachines: 3, availableMachines: 7, reservedMachines: 0, activeUsers: 4,
    }));
    analytics.getActivityLog.and.returnValue(of([]));
    analytics.getUsageStats.and.returnValue(of({ period: 'week', totalSessions: 0, mostUsed: [], leastUsed: [] }));
    analytics.getPeakHours.and.returnValue(of({ period: 'week', peakHours: [] }));
    summary = signal<EquipmentIssueSummary | null>(null);
    arrivals = new Subject<EquipmentIssueReport[]>();

    TestBed.configureTestingModule({
      imports: [DashboardHomeComponent],
      providers: [
        provideNoopAnimations(),
        { provide: AnalyticsService, useValue: analytics },
        // EquipmentIssueStore (started by the shell) keeps this summary current
        { provide: EquipmentIssueService, useValue: { summary } },
        { provide: EquipmentIssueStore, useValue: { arrivals$: arrivals.asObservable() } },
      ],
    });
  });

  describe('activity feed icons', () => {
    let component: DashboardHomeComponent;

    beforeEach(() => {
      component = TestBed.runInInjectionContext(() => new DashboardHomeComponent());
    });

    it('marks equipment issue events with a problem icon', () => {
      expect(component.isMaintenanceEvent('ISSUE_REPORTED')).toBeTrue();
      expect(component.isMaintenanceEvent('ISSUE_STATUS_CHANGED')).toBeTrue();
      expect(component.activityIcon('ISSUE_REPORTED')).toBe('report_problem');
    });

    it('marks machines going out of or back into service with a build icon', () => {
      expect(component.isMaintenanceEvent('EQUIPMENT_OUT_OF_ORDER')).toBeTrue();
      expect(component.isMaintenanceEvent('EQUIPMENT_BACK_IN_SERVICE')).toBeTrue();
      expect(component.activityIcon('EQUIPMENT_OUT_OF_ORDER')).toBe('build');
      expect(component.activityIcon('EQUIPMENT_BACK_IN_SERVICE')).toBe('build');
    });

    it('keeps the existing check-in and check-out icons', () => {
      expect(component.isMaintenanceEvent('CHECK_IN')).toBeFalse();
      expect(component.activityIcon('CHECK_IN')).toBe('login');
      expect(component.activityIcon('CHECK_OUT')).toBe('logout');
      expect(component.activityIcon('SESSION_SAVED')).toBe('logout');
    });
  });

  describe('equipment issues', () => {
    let fixture: ComponentFixture<DashboardHomeComponent>;
    const outOfOrderLine = (): HTMLElement | null =>
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="out-of-order-count"]');

    beforeEach(async () => {
      await TestBed.compileComponents();
      fixture = TestBed.createComponent(DashboardHomeComponent);
      fixture.detectChanges();
    });

    it('quietly mentions how many machines are out of order under Total Machines', () => {
      expect(outOfOrderLine()).toBeNull(); // nothing until the counts have loaded

      summary.set(SUMMARY);
      fixture.detectChanges();
      expect(outOfOrderLine()?.textContent).toContain('2 out of order');
      expect(outOfOrderLine()?.classList).toContain('text-gray-600');

      summary.set({ ...SUMMARY, outOfOrderMachines: 0 });
      fixture.detectChanges();
      expect(outOfOrderLine()?.textContent).toContain('0 out of order');
      expect(outOfOrderLine()?.classList).toContain('text-gray-400');
    });

    it('reloads Recent Activity when a new equipment issue arrives, without a page refresh', () => {
      expect(analytics.getActivityLog).toHaveBeenCalledTimes(1);

      arrivals.next([]);

      expect(analytics.getActivityLog).toHaveBeenCalledTimes(2);
    });
  });
});
