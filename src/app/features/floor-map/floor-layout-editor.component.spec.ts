import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FloorLayoutEditorComponent } from './floor-layout-editor.component';
import { FloorPlanService } from '../../core/services/floor-plan.service';
import { FloorPlan } from '../../core/models/floor-plan.model';
describe('Floor layout editor', () => {
  const floor: FloorPlan = {
    id: 7,
    name: 'Ground',
    width: 800,
    height: 600,
    floorNumber: 0,
    imageUrl: null,
    equipment: [],
    layout: {
      version: 1,
      areas: [
        {
          id: 'pool',
          name: 'Pool',
          kind: 'pool',
          shape: 'rect',
          x: 20,
          y: 40,
          width: 200,
          height: 150,
        },
      ],
    },
  };
  let service: jasmine.SpyObj<FloorPlanService>,
    editor: FloorLayoutEditorComponent;
  beforeEach(async () => {
    service = jasmine.createSpyObj('FloorPlanService', ['updateLayout']);
    await TestBed.configureTestingModule({
      imports: [FloorLayoutEditorComponent],
      providers: [{ provide: FloorPlanService, useValue: service }],
    }).compileComponents();
    const f = TestBed.createComponent(FloorLayoutEditorComponent);
    f.componentRef.setInput('floor', structuredClone(floor));
    f.detectChanges();
    editor = f.componentInstance;
  });
  it('keeps edits local until save and emits the persisted floor', () => {
    const dirty = spyOn(editor.dirtyChange, 'emit'),
      saved = spyOn(editor.saved, 'emit');
    editor.field(editor.draft.areas[0], 'name', 'Aquatics');
    expect(floor.layout!.areas[0].name).toBe('Pool');
    expect(dirty).toHaveBeenCalledWith(true);
    const updated = { ...floor, layout: structuredClone(editor.draft) };
    service.updateLayout.and.returnValue(of(updated));
    editor.save();
    expect(service.updateLayout).toHaveBeenCalledWith(7, editor.draft);
    expect(saved).toHaveBeenCalledWith(updated);
    expect(editor.dirty).toBeFalse();
  });
  it('preserves unsaved geometry after a rejected save', () => {
    editor.field(editor.draft.areas[0], 'width', 9999);
    service.updateLayout.and.returnValue(
      throwError(() => ({ error: { detail: 'Outside floor' } })),
    );
    editor.save();
    expect(editor.dirty).toBeTrue();
    expect(editor.error).toBe('Outside floor');
    expect(editor.draft.areas[0].width).toBe(9999);
  });
  it('creates and edits polygon vertices and deletes draft areas', () => {
    editor.add('polygon');
    const p = editor.selected!;
    expect(p.points!.length).toBe(3);
    editor.vertex(p, 0, 'x', 80);
    editor.addVertex(p);
    expect(p.points!.length).toBe(4);
    expect(p.points![0].x).toBe(80);
    editor.removeVertex(p);
    expect(p.points!.length).toBe(3);
    editor.remove(p);
    expect(editor.draft.areas.length).toBe(1);
    expect(editor.dirty).toBeTrue();
  });
  it('clamps drag and resize to floor bounds', () => {
    const a = editor.draft.areas[0],
      svg = document.createElement('div');
    spyOn(svg, 'getBoundingClientRect').and.returnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
    } as DOMRect);
    editor.drag(
      new MouseEvent('mousedown', { clientX: 20, clientY: 40 }),
      a,
      svg,
    );
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 1000, clientY: 1000 }),
    );
    document.dispatchEvent(new MouseEvent('mouseup'));
    expect(a.x).toBe(600);
    expect(a.y).toBe(450);
    editor.drag(
      new MouseEvent('mousedown', { clientX: 800, clientY: 600 }),
      a,
      svg,
      'resize',
    );
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 1500, clientY: 1500 }),
    );
    document.dispatchEvent(new MouseEvent('mouseup'));
    expect(a.width).toBe(200);
    expect(a.height).toBe(150);
  });
});
