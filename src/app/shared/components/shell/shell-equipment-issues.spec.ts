import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ChatReportStore } from '../../../core/services/chat-report-store.service';
import { EquipmentIssueStore } from '../../../core/services/equipment-issue-store.service';
import { HelpRequestStore } from '../../../core/services/help-request-store.service';
import { ShellComponent } from './shell.component';

describe('ShellComponent equipment issue alerts', () => {
  it('watches for new equipment issues for the whole signed-in session', () => {
    const store = jasmine.createSpyObj<EquipmentIssueStore>('EquipmentIssueStore', ['start', 'stop']);
    TestBed.configureTestingModule({
      providers: [
        { provide: EquipmentIssueStore, useValue: store },
        { provide: HelpRequestStore, useValue: jasmine.createSpyObj('HelpRequestStore', ['start', 'stop']) },
        {
          provide: ChatReportStore,
          useValue: jasmine.createSpyObj('ChatReportStore', ['start', 'stop'], { openMessages: signal(0) }),
        },
      ],
    });
    const shell = TestBed.runInInjectionContext(() => new ShellComponent());

    shell.ngOnInit();
    expect(store.start).toHaveBeenCalledTimes(1);

    shell.ngOnDestroy();
    expect(store.stop).toHaveBeenCalledTimes(1);
  });
});

describe('ShellComponent reported chat messages', () => {
  it('watches for reported messages for the whole signed-in session', () => {
    const store = jasmine.createSpyObj<ChatReportStore>('ChatReportStore', ['start', 'stop'], { openMessages: signal(0) });
    TestBed.configureTestingModule({
      providers: [
        { provide: ChatReportStore, useValue: store },
        { provide: EquipmentIssueStore, useValue: jasmine.createSpyObj('EquipmentIssueStore', ['start', 'stop']) },
        { provide: HelpRequestStore, useValue: jasmine.createSpyObj('HelpRequestStore', ['start', 'stop']) },
      ],
    });
    const shell = TestBed.runInInjectionContext(() => new ShellComponent());

    shell.ngOnInit();
    expect(store.start).toHaveBeenCalledTimes(1);

    shell.ngOnDestroy();
    expect(store.stop).toHaveBeenCalledTimes(1);
  });
});
