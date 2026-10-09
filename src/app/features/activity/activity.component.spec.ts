import { TestBed } from '@angular/core/testing';
import { ActivityService } from '../../core/services/activity.service';
import { ActivityComponent } from './activity.component';

describe('ActivityComponent', () => {
  let component: ActivityComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ActivityService, useValue: jasmine.createSpyObj('ActivityService', ['getLogs', 'getSummary']) }],
    });
    component = TestBed.runInInjectionContext(() => new ActivityComponent());
  });

  it('offers the equipment issue events as filters', () => {
    expect(component.eventTypes).toContain('ISSUE_REPORTED');
    expect(component.eventTypes).toContain('ISSUE_STATUS_CHANGED');
  });

  it('labels and colours equipment issue events', () => {
    expect(component.formatEventType('ISSUE_REPORTED')).toBe('Issue Reported');
    expect(component.formatEventType('ISSUE_STATUS_CHANGED')).toBe('Issue Updated');
    expect(component.eventClass('ISSUE_REPORTED')).toBe('bg-orange-100 text-orange-700');
    expect(component.eventClass('ISSUE_STATUS_CHANGED')).toBe('bg-sky-100 text-sky-700');
  });

  it('labels reports members withdrew as filed by mistake', () => {
    expect(component.eventTypes).toContain('ISSUE_WITHDRAWN');
    expect(component.formatEventType('ISSUE_WITHDRAWN')).toBe('Issue Withdrawn');
    expect(component.eventClass('ISSUE_WITHDRAWN')).toBe('bg-slate-100 text-slate-700');
  });

  it('labels machines going out of and back into service', () => {
    expect(component.eventTypes).toContain('EQUIPMENT_OUT_OF_ORDER');
    expect(component.eventTypes).toContain('EQUIPMENT_BACK_IN_SERVICE');
    expect(component.formatEventType('EQUIPMENT_OUT_OF_ORDER')).toBe('Out of Order');
    expect(component.formatEventType('EQUIPMENT_BACK_IN_SERVICE')).toBe('Back in Service');
    expect(component.eventClass('EQUIPMENT_OUT_OF_ORDER')).toBe('bg-gray-200 text-gray-700');
    expect(component.eventClass('EQUIPMENT_BACK_IN_SERVICE')).toBe('bg-emerald-100 text-emerald-700');
  });
});
