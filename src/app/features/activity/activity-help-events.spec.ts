import { TestBed } from '@angular/core/testing';
import { ActivityService } from '../../core/services/activity.service';
import { ActivityComponent } from './activity.component';

describe('ActivityComponent help request events', () => {
  let component: ActivityComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ActivityService, useValue: jasmine.createSpyObj('ActivityService', ['getLogs', 'getSummary']) }],
    });
    component = TestBed.runInInjectionContext(() => new ActivityComponent());
  });

  it('offers the help request events as filters', () => {
    expect(component.eventTypes).toContain('HELP_REQUESTED');
    expect(component.eventTypes).toContain('HELP_STATUS_CHANGED');
    expect(component.eventTypes).toContain('HELP_CLOSED');
  });

  it('labels them', () => {
    expect(component.formatEventType('HELP_REQUESTED')).toBe('Help Requested');
    expect(component.formatEventType('HELP_STATUS_CHANGED')).toBe('Help Response');
    expect(component.formatEventType('HELP_CLOSED')).toBe('Help Closed');
  });

  it('gives each its own colour', () => {
    const classes = ['HELP_REQUESTED', 'HELP_STATUS_CHANGED', 'HELP_CLOSED'].map((et) => component.eventClass(et));

    expect(classes).toEqual(['bg-yellow-100 text-yellow-800', 'bg-lime-100 text-lime-800', 'bg-cyan-100 text-cyan-700']);
    expect(classes).not.toContain(component.eventClass('UNKNOWN_EVENT'));
  });
});
