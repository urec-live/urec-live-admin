import { TestBed } from '@angular/core/testing';
import { EquipmentIssueStore } from '../../../core/services/equipment-issue-store.service';
import { ShellComponent } from './shell.component';

describe('ShellComponent equipment issue alerts', () => {
  it('watches for new equipment issues for the whole signed-in session', () => {
    const store = jasmine.createSpyObj<EquipmentIssueStore>('EquipmentIssueStore', ['start', 'stop']);
    TestBed.configureTestingModule({ providers: [{ provide: EquipmentIssueStore, useValue: store }] });
    const shell = TestBed.runInInjectionContext(() => new ShellComponent());

    shell.ngOnInit();
    expect(store.start).toHaveBeenCalledTimes(1);

    shell.ngOnDestroy();
    expect(store.stop).toHaveBeenCalledTimes(1);
  });
});
