import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { DashboardHomeComponent } from './dashboard-home.component';

describe('DashboardHomeComponent activity feed', () => {
  let component: DashboardHomeComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: AnalyticsService, useValue: jasmine.createSpyObj('AnalyticsService', ['getLiveSnapshot']) }],
    });
    component = TestBed.runInInjectionContext(() => new DashboardHomeComponent());
  });

  it('marks equipment issue events with a problem icon', () => {
    expect(component.isIssueEvent('ISSUE_REPORTED')).toBeTrue();
    expect(component.isIssueEvent('ISSUE_STATUS_CHANGED')).toBeTrue();
    expect(component.activityIcon('ISSUE_REPORTED')).toBe('report_problem');
  });

  it('keeps the existing check-in and check-out icons', () => {
    expect(component.isIssueEvent('CHECK_IN')).toBeFalse();
    expect(component.activityIcon('CHECK_IN')).toBe('login');
    expect(component.activityIcon('CHECK_OUT')).toBe('logout');
    expect(component.activityIcon('SESSION_SAVED')).toBe('logout');
  });
});
