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
});
