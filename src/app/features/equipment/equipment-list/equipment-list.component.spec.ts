import { TestBed } from '@angular/core/testing';
import { EquipmentService } from '../../../core/services/equipment.service';
import { EquipmentListComponent } from './equipment-list.component';

describe('EquipmentListComponent statuses', () => {
  let component: EquipmentListComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: EquipmentService, useValue: jasmine.createSpyObj('EquipmentService', ['getAll']) }],
    });
    component = TestBed.runInInjectionContext(() => new EquipmentListComponent());
  });

  it('can filter by Out of Order', () => {
    expect(component.statuses).toContain('Out of Order');
  });

  it('shows Out of Order as a grey chip', () => {
    expect(component.statusClass('Out of Order')).toBe('bg-gray-200 text-gray-700');
    expect(component.statusClass('Available')).toBe('bg-green-100 text-green-700');
  });
});
