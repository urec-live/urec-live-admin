import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FloorArea,
  FloorPlan,
  FloorLayout,
} from '../../core/models/floor-plan.model';
import { FloorPlanService } from '../../core/services/floor-plan.service';

export const AREA_COLORS: Record<string, string> = {
  pool: '#D9EEF7',
  court: '#F1E4CC',
  track: '#DEE8E1',
  turf: '#D5E9C9',
  strength: '#EDF1EF',
  cardio: '#E9EFF6',
  studio: '#F1ECF7',
  room: '#F2F3F4',
  amenity: '#EEF0F2',
  stairs: '#DBE1E5',
  elevator: '#DBE1E5',
  entrance: '#E5F1E9',
  void: '#F9FAFB',
};
@Component({
  selector: 'app-floor-layout-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [
    `
      :host {
        display: flex;
        flex: 1;
        min-height: 0;
      }
      button {
        padding: 8px 12px;
        border-radius: 6px;
        background: #eaf3ed;
        color: #216c50;
      }
      input,
      select {
        width: 100%;
        padding: 7px;
        border: 1px solid #cedcd2;
        border-radius: 5px;
      }
      label {
        font-size: 12px;
        color: #516b5b;
      }
      .fields {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
    `,
  ],
  template: `
    <div class="flex-1 overflow-auto bg-gray-100 p-4">
      <svg
        #surface
        [attr.width]="floor.width"
        [attr.height]="floor.height"
        class="bg-white rounded-xl border border-gray-200"
        aria-label="Floor area editor"
      >
        @for (a of draft.areas; track a.id) {
          <g (mousedown)="drag($event, a, surface)" style="cursor:move">
            @if (a.shape === 'rect') {
              <rect
                [attr.x]="a.x"
                [attr.y]="a.y"
                [attr.width]="a.width"
                [attr.height]="a.height"
                rx="8"
                [attr.fill]="colors[a.kind]"
                [attr.stroke]="selectedId === a.id ? '#193D75' : '#B8C7BE'"
                [attr.stroke-width]="selectedId === a.id ? 5 : 2"
              />
            } @else {
              <polygon
                [attr.points]="points(a)"
                [attr.fill]="colors[a.kind]"
                [attr.stroke]="selectedId === a.id ? '#193D75' : '#B8C7BE'"
                [attr.stroke-width]="selectedId === a.id ? 5 : 2"
              />
            }
            <text
              [attr.x]="bounds(a).x + bounds(a).width / 2"
              [attr.y]="bounds(a).y + 26"
              text-anchor="middle"
              fill="#4A5D53"
              font-size="18"
            >
              {{ a.name }}
            </text>
          </g>
        }
        @for (eq of floor.equipment; track eq.id) {
          @if (eq.floorX !== null && eq.floorY !== null) {
            <circle
              [attr.cx]="eq.floorX"
              [attr.cy]="eq.floorY"
              r="9"
              fill="#216C50"
              stroke="white"
              stroke-width="2"
              pointer-events="none"
            />
          }
        }
        @if (selected; as a) {
          @if (a.shape === 'rect') {
            <rect
              [attr.x]="a.x! + a.width! - 8"
              [attr.y]="a.y! + a.height! - 8"
              width="16"
              height="16"
              fill="#193D75"
              style="cursor:se-resize"
              (mousedown)="drag($event, a, surface, 'resize')"
            />
          } @else {
            @for (p of a.points; track $index) {
              <circle
                [attr.cx]="p.x"
                [attr.cy]="p.y"
                r="9"
                fill="#193D75"
                stroke="white"
                style="cursor:crosshair"
                (mousedown)="drag($event, a, surface, 'vertex', $index)"
              />
            }
          }
        }
      </svg>
    </div>
    <aside class="w-72 border-l bg-white overflow-auto p-4 space-y-3">
      <h2 class="font-semibold text-gray-800">Rooms & places</h2>
      <p class="text-xs text-gray-500">
        Drag an area to move it. Drag a corner or polygon vertex to reshape it.
      </p>
      <div class="flex gap-2">
        <button (click)="add('rect')">+ Rectangle</button
        ><button (click)="add('polygon')">+ Polygon</button>
      </div>
      <label
        >Selected area<select
          aria-label="Selected area"
          [(ngModel)]="selectedId"
        >
          <option value="">Choose an area</option>
          @for (a of draft.areas; track a.id) {
            <option [value]="a.id">{{ a.name }}</option>
          }
        </select></label
      >
      @if (selected; as a) {
        <label
          >Name<input
            aria-label="Area name"
            [ngModel]="a.name"
            (ngModelChange)="field(a, 'name', $event)"
            maxlength="100"
        /></label>
        <label
          >Type<select
            aria-label="Area type"
            [ngModel]="a.kind"
            (ngModelChange)="field(a, 'kind', $event)"
          >
            @for (k of kinds; track k) {
              <option [value]="k">{{ k }}</option>
            }
          </select></label
        >
        @if (a.shape === 'rect') {
          <div class="fields">
            @for (k of rectFields; track k) {
              <label
                >{{ k
                }}<input
                  type="number"
                  [attr.aria-label]="'Area ' + k"
                  [ngModel]="a[k]"
                  (ngModelChange)="field(a, k, $event)"
              /></label>
            }
          </div>
        } @else {
          @for (p of a.points; track $index) {
            <div class="fields">
              <label
                >Vertex {{ $index + 1 }} X<input
                  type="number"
                  [ngModel]="p.x"
                  (ngModelChange)="vertex(a, $index, 'x', $event)" /></label
              ><label
                >Y<input
                  type="number"
                  [ngModel]="p.y"
                  (ngModelChange)="vertex(a, $index, 'y', $event)"
              /></label>
            </div>
          }
          <div class="flex gap-2">
            <button (click)="addVertex(a)" [disabled]="a.points!.length >= 64">
              Add vertex</button
            ><button
              (click)="removeVertex(a)"
              [disabled]="a.points!.length <= 3"
            >
              Remove last
            </button>
          </div>
        }
        <button (click)="remove(a)" style="color:#b42318;background:#fff0ed">
          Delete area
        </button>
      }
      @if (error) {
        <p role="alert" class="text-sm text-red-700">{{ error }}</p>
      }
      <button
        (click)="save()"
        [disabled]="!dirty || saving"
        [style.opacity]="dirty && !saving ? 1 : 0.5"
      >
        {{ saving ? 'Saving…' : 'Save layout' }}
      </button>
      <p class="text-xs text-gray-500">
        {{ dirty ? 'Unsaved layout changes' : 'Layout saved' }} · Equipment
        positions save separately.
      </p>
    </aside>
  `,
})
export class FloorLayoutEditorComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) floor!: FloorPlan;
  @Output() dirtyChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<FloorPlan>();
  private service = inject(FloorPlanService);
  draft: FloorLayout = { version: 1, areas: [] };
  selectedId = '';
  dirty = false;
  saving = false;
  error = '';
  colors = AREA_COLORS;
  kinds = Object.keys(AREA_COLORS);
  rectFields = ['x', 'y', 'width', 'height'] as const;
  private stopDrag: (() => void) | null = null;
  ngOnChanges() {
    this.draft = structuredClone(
      this.floor.layout ?? { version: 1, areas: [] },
    );
    this.dirty = false;
    this.dirtyChange.emit(false);
  }
  ngOnDestroy() {
    this.stopDrag?.();
  }
  get selected() {
    return this.draft.areas.find((a) => a.id === this.selectedId);
  }
  changed() {
    this.dirty = true;
    this.error = '';
    this.dirtyChange.emit(true);
  }
  bounds(a: FloorArea) {
    if (a.shape === 'rect')
      return { x: a.x!, y: a.y!, width: a.width!, height: a.height! };
    const ps = a.points ?? [];
    const x = Math.min(...ps.map((p) => p.x)),
      y = Math.min(...ps.map((p) => p.y));
    return {
      x,
      y,
      width: Math.max(...ps.map((p) => p.x)) - x,
      height: Math.max(...ps.map((p) => p.y)) - y,
    };
  }
  points(a: FloorArea) {
    return a.points?.map((p) => `${p.x},${p.y}`).join(' ');
  }
  add(shape: 'rect' | 'polygon') {
    const a: FloorArea = {
      id: crypto.randomUUID(),
      name: 'New area',
      kind: 'room',
      shape,
      ...(shape === 'rect'
        ? { x: 40, y: 40, width: 200, height: 150 }
        : {
            points: [
              { x: 40, y: 40 },
              { x: 240, y: 40 },
              { x: 140, y: 190 },
            ],
          }),
    };
    this.draft.areas.push(a);
    this.selectedId = a.id;
    this.changed();
  }
  field(a: FloorArea, key: string, value: unknown) {
    Object.assign(a, { [key]: value });
    this.changed();
  }
  vertex(a: FloorArea, index: number, key: 'x' | 'y', value: number) {
    a.points![index][key] = value;
    this.changed();
  }
  addVertex(a: FloorArea) {
    const first = a.points![0],
      last = a.points!.at(-1)!;
    a.points!.push({ x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 });
    this.changed();
  }
  removeVertex(a: FloorArea) {
    a.points!.pop();
    this.changed();
  }
  remove(a: FloorArea) {
    this.draft.areas = this.draft.areas.filter((v) => v.id !== a.id);
    this.selectedId = '';
    this.changed();
  }
  drag(
    event: MouseEvent,
    a: FloorArea,
    svg: Element,
    mode: 'move' | 'resize' | 'vertex' = 'move',
    index = 0,
  ) {
    event.preventDefault();
    event.stopPropagation();
    this.stopDrag?.();
    this.selectedId = a.id;
    const original = structuredClone(a),
      b = this.bounds(a),
      rect = svg.getBoundingClientRect();
    const move = (e: MouseEvent) => {
      let dx = ((e.clientX - event.clientX) * this.floor.width) / rect.width,
        dy = ((e.clientY - event.clientY) * this.floor.height) / rect.height;
      if (mode === 'resize') {
        a.width = Math.max(
          20,
          Math.min(this.floor.width - original.x!, original.width! + dx),
        );
        a.height = Math.max(
          20,
          Math.min(this.floor.height - original.y!, original.height! + dy),
        );
      } else if (mode === 'vertex') {
        a.points![index] = {
          x: Math.max(
            0,
            Math.min(this.floor.width, original.points![index].x + dx),
          ),
          y: Math.max(
            0,
            Math.min(this.floor.height, original.points![index].y + dy),
          ),
        };
      } else {
        dx = Math.max(-b.x, Math.min(this.floor.width - b.x - b.width, dx));
        dy = Math.max(-b.y, Math.min(this.floor.height - b.y - b.height, dy));
        if (a.shape === 'rect') {
          a.x = original.x! + dx;
          a.y = original.y! + dy;
        } else
          a.points = original.points!.map((p) => ({
            x: p.x + dx,
            y: p.y + dy,
          }));
      }
      this.changed();
    };
    const stop = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', stop);
      this.stopDrag = null;
    };
    this.stopDrag = stop;
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', stop);
  }
  save() {
    this.saving = true;
    this.error = '';
    this.service.updateLayout(this.floor.id, this.draft).subscribe({
      next: (floor) => {
        this.saving = false;
        this.dirty = false;
        this.dirtyChange.emit(false);
        this.saved.emit(floor);
      },
      error: (err) => {
        this.saving = false;
        this.error =
          err.error?.detail ??
          err.error?.message ??
          'Could not save layout. Check names and geometry: all areas must fit inside this floor.';
      },
    });
  }
}
