import {
  Component,
  inject,
  OnInit,
  DestroyRef,
  ElementRef,
  ViewChild,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import {
  CdkDragDrop,
  CdkDrag,
  CdkDropList,
  DragDropModule,
} from '@angular/cdk/drag-drop';
import { FloorPlanService } from '../../core/services/floor-plan.service';
import {
  FloorPlan,
  FloorPlanEquipment,
  EquipmentPosition,
} from '../../core/models/floor-plan.model';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';

interface CanvasEquipment extends FloorPlanEquipment {
  canvasX: number;
  canvasY: number;
  isDirty: boolean;
}

@Component({
  selector: 'app-floor-map-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTabsModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule,
    DragDropModule,
  ],
  template: `
    <div class="flex flex-col h-full">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Floor Map Editor</h1>
          <p class="text-sm text-gray-500 mt-1">Drag equipment onto each floor to set positions</p>
        </div>
        <div class="flex items-center gap-3">
          <button mat-flat-button color="primary" (click)="addFloor()" class="!rounded-lg">
            <mat-icon>add</mat-icon>
            Add Floor
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="flex-1 flex items-center justify-center">
          <mat-spinner diameter="48"></mat-spinner>
        </div>
      } @else {
        <div class="flex-1 flex overflow-hidden">
          <!-- Floor tabs (left sidebar) -->
          <div class="w-56 border-r border-gray-200 bg-gray-50 flex flex-col">
            <div class="p-3 border-b border-gray-200">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Floors</span>
            </div>
            <div class="flex-1 overflow-y-auto p-2 space-y-1">
              @for (floor of floors(); track floor.id) {
                <button
                  (click)="selectFloor(floor)"
                  class="w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center justify-between group"
                  [class.bg-indigo-100]="selectedFloor()?.id === floor.id"
                  [class.text-indigo-800]="selectedFloor()?.id === floor.id"
                  [class.hover:bg-gray-100]="selectedFloor()?.id !== floor.id"
                >
                  <div>
                    <div class="font-medium text-sm">{{ floor.name }}</div>
                    <div class="text-xs text-gray-500">
                      {{ floor.equipment.length }} equipment · Floor {{ floor.floorNumber }}
                    </div>
                  </div>
                  <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button mat-icon-button class="!w-7 !h-7" (click)="editFloor(floor, $event)"
                            matTooltip="Edit floor">
                      <mat-icon class="!text-base">edit</mat-icon>
                    </button>
                    <button mat-icon-button class="!w-7 !h-7" (click)="deleteFloor(floor, $event)"
                            matTooltip="Delete floor">
                      <mat-icon class="!text-base text-red-500">delete</mat-icon>
                    </button>
                  </div>
                </button>
              }
              @if (floors().length === 0) {
                <div class="text-center py-8 text-gray-400 text-sm">
                  No floors yet.<br>Click "Add Floor" to start.
                </div>
              }
            </div>
          </div>

          <!-- Main canvas area -->
          <div class="flex-1 flex flex-col overflow-hidden">
            @if (selectedFloor()) {
              <!-- Toolbar -->
              <div class="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
                <div class="flex items-center gap-4">
                  <span class="text-sm font-semibold text-gray-700">
                    {{ selectedFloor()!.name }}
                  </span>
                  <span class="text-xs text-gray-400">
                    {{ selectedFloor()!.width }}×{{ selectedFloor()!.height }}px
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  @if (hasUnsavedChanges()) {
                    <span class="text-xs text-amber-600 font-medium mr-2">● Unsaved changes</span>
                  }
                  <button mat-flat-button color="primary" (click)="savePositions()"
                          [disabled]="!hasUnsavedChanges() || saving()"
                          class="!rounded-lg !text-sm">
                    @if (saving()) {
                      <mat-spinner diameter="18" class="mr-2"></mat-spinner>
                    }
                    <mat-icon>save</mat-icon>
                    Save Positions
                  </button>
                </div>
              </div>

              <div class="flex-1 flex overflow-hidden">
                <!-- Canvas -->
                <div class="flex-1 overflow-auto bg-gray-100 p-4" #canvasContainer>
                  <div
                    class="relative bg-white border-2 border-dashed border-gray-300 rounded-xl mx-auto"
                    [style.width.px]="selectedFloor()!.width"
                    [style.height.px]="selectedFloor()!.height"
                    #canvas
                    (drop)="onCanvasDrop($event)"
                    (dragover)="onCanvasDragOver($event)"
                  >
                    <!-- Grid lines -->
                    <svg class="absolute inset-0 pointer-events-none" [attr.width]="selectedFloor()!.width" [attr.height]="selectedFloor()!.height">
                      @for (i of gridLinesV(); track i) {
                        <line [attr.x1]="i" y1="0" [attr.x2]="i" [attr.y2]="selectedFloor()!.height"
                              stroke="#f0f0f0" stroke-width="0.5"/>
                      }
                      @for (i of gridLinesH(); track i) {
                        <line x1="0" [attr.y1]="i" [attr.x2]="selectedFloor()!.width" [attr.y2]="i"
                              stroke="#f0f0f0" stroke-width="0.5"/>
                      }
                    </svg>

                    <!-- Placed equipment markers -->
                    @for (eq of canvasEquipment(); track eq.id) {
                      <div
                        class="absolute cursor-grab active:cursor-grabbing select-none group"
                        [style.left.px]="eq.canvasX - 20"
                        [style.top.px]="eq.canvasY - 20"
                        (mousedown)="startDragOnCanvas($event, eq)"
                      >
                        <div class="relative">
                          <div
                            class="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md transition-transform group-hover:scale-110"
                            [class.bg-green-500]="eq.status === 'Available'"
                            [class.bg-red-500]="eq.status === 'In Use'"
                            [class.bg-orange-500]="eq.status === 'Reserved'"
                            [class.ring-2]="eq.isDirty"
                            [class.ring-amber-400]="eq.isDirty"
                          >
                            <mat-icon class="!text-base">fitness_center</mat-icon>
                          </div>
                          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap
                                      bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded
                                      opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {{ eq.name }}
                          </div>
                          <!-- Remove from floor button -->
                          <button
                            class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full
                                   flex items-center justify-center opacity-0 group-hover:opacity-100
                                   transition-opacity text-[10px] leading-none cursor-pointer"
                            (click)="removeFromFloor(eq, $event)"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    }

                    <!-- Drop zone hint -->
                    @if (canvasEquipment().length === 0) {
                      <div class="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
                        <div class="text-center">
                          <mat-icon class="!text-5xl !w-12 !h-12 mb-2">drag_indicator</mat-icon>
                          <p class="text-sm">Drag equipment from the sidebar<br>to place them on this floor</p>
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- Equipment sidebar (right) -->
                <div class="w-64 border-l border-gray-200 bg-white flex flex-col">
                  <div class="p-3 border-b border-gray-200">
                    <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Unassigned Equipment
                    </span>
                    <span class="text-xs text-gray-400 ml-1">({{ unassignedEquipment().length }})</span>
                  </div>
                  <div class="flex-1 overflow-y-auto p-2 space-y-1">
                    @for (eq of unassignedEquipment(); track eq.id) {
                      <div
                        class="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 cursor-grab
                               hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
                        draggable="true"
                        (dragstart)="onSidebarDragStart($event, eq)"
                      >
                        <div
                          class="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px]"
                          [class.bg-green-500]="eq.status === 'Available'"
                          [class.bg-red-500]="eq.status === 'In Use'"
                          [class.bg-orange-500]="eq.status === 'Reserved'"
                        >
                          <mat-icon class="!text-xs">fitness_center</mat-icon>
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-medium text-gray-800 truncate">{{ eq.name }}</div>
                          <div class="text-[10px] text-gray-400">{{ eq.code }}</div>
                        </div>
                      </div>
                    }
                    @if (unassignedEquipment().length === 0) {
                      <div class="text-center py-6 text-gray-400 text-xs">
                        All equipment assigned to floors
                      </div>
                    }
                  </div>
                </div>
              </div>
            } @else {
              <div class="flex-1 flex items-center justify-center text-gray-400">
                <div class="text-center">
                  <mat-icon class="!text-6xl !w-16 !h-16 mb-3 text-gray-300">layers</mat-icon>
                  <p class="text-lg font-medium text-gray-500">Select a floor to edit</p>
                  <p class="text-sm mt-1">Or create a new floor to get started</p>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>

    <!-- Inline edit dialog overlay -->
    @if (editingFloor()) {
      <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
           (click)="cancelEditFloor()">
        <div class="bg-white rounded-xl shadow-2xl p-6 w-96" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-bold text-gray-900 mb-4">
            {{ editingFloor()!.id ? 'Edit Floor' : 'New Floor' }}
          </h2>
          <div class="space-y-4">
            <mat-form-field class="w-full" appearance="outline">
              <mat-label>Floor Name</mat-label>
              <input matInput [(ngModel)]="editForm.name" placeholder="e.g. Ground Floor">
            </mat-form-field>
            <mat-form-field class="w-full" appearance="outline">
              <mat-label>Floor Number</mat-label>
              <input matInput type="number" [(ngModel)]="editForm.floorNumber" min="1">
            </mat-form-field>
            <div class="flex gap-3">
              <mat-form-field class="flex-1" appearance="outline">
                <mat-label>Width (px)</mat-label>
                <input matInput type="number" [(ngModel)]="editForm.width" min="400" max="2000">
              </mat-form-field>
              <mat-form-field class="flex-1" appearance="outline">
                <mat-label>Height (px)</mat-label>
                <input matInput type="number" [(ngModel)]="editForm.height" min="300" max="1500">
              </mat-form-field>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button mat-button (click)="cancelEditFloor()">Cancel</button>
            <button mat-flat-button color="primary" (click)="saveFloor()"
                    [disabled]="!editForm.name">
              {{ editingFloor()!.id ? 'Update' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class FloorMapEditorComponent implements OnInit {
  private floorPlanService = inject(FloorPlanService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  loading = signal(true);
  saving = signal(false);
  floors = signal<FloorPlan[]>([]);
  selectedFloor = signal<FloorPlan | null>(null);
  unassignedEquipment = signal<FloorPlanEquipment[]>([]);
  canvasEquipment = signal<CanvasEquipment[]>([]);
  editingFloor = signal<Partial<FloorPlan> | null>(null);

  editForm = { name: '', floorNumber: 1, width: 800, height: 600 };

  private draggingEquipment: FloorPlanEquipment | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private activeDragEq: CanvasEquipment | null = null;

  gridLinesV = computed(() => {
    const floor = this.selectedFloor();
    if (!floor) return [];
    const lines = [];
    for (let i = 50; i < floor.width; i += 50) lines.push(i);
    return lines;
  });

  gridLinesH = computed(() => {
    const floor = this.selectedFloor();
    if (!floor) return [];
    const lines = [];
    for (let i = 50; i < floor.height; i += 50) lines.push(i);
    return lines;
  });

  hasUnsavedChanges = computed(() => {
    return this.canvasEquipment().some((e) => e.isDirty);
  });

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLDivElement>;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.floorPlanService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (floors) => {
          this.floors.set(floors);
          if (floors.length > 0 && !this.selectedFloor()) {
            this.selectFloor(floors[0]);
          } else if (this.selectedFloor()) {
            const updated = floors.find((f) => f.id === this.selectedFloor()!.id);
            if (updated) this.selectFloor(updated);
          }
          this.loadUnassigned();
        },
        error: () => {
          this.snackBar.open('Failed to load floor plans', 'Close', { duration: 3000 });
          this.loading.set(false);
        },
      });
  }

  loadUnassigned() {
    this.floorPlanService
      .getUnassignedEquipment()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (eq) => {
          this.unassignedEquipment.set(eq);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  selectFloor(floor: FloorPlan) {
    this.selectedFloor.set(floor);
    this.canvasEquipment.set(
      floor.equipment.map((eq) => ({
        ...eq,
        canvasX: eq.floorX ?? floor.width / 2,
        canvasY: eq.floorY ?? floor.height / 2,
        isDirty: false,
      }))
    );
  }

  addFloor() {
    this.editForm = { name: '', floorNumber: this.floors().length + 1, width: 800, height: 600 };
    this.editingFloor.set({ id: 0 } as any);
  }

  editFloor(floor: FloorPlan, event: Event) {
    event.stopPropagation();
    this.editForm = {
      name: floor.name,
      floorNumber: floor.floorNumber,
      width: floor.width,
      height: floor.height,
    };
    this.editingFloor.set(floor);
  }

  cancelEditFloor() {
    this.editingFloor.set(null);
  }

  saveFloor() {
    const editing = this.editingFloor();
    if (!editing) return;

    const body = {
      name: this.editForm.name,
      floorNumber: this.editForm.floorNumber,
      width: this.editForm.width,
      height: this.editForm.height,
    };

    if (editing.id && editing.id > 0) {
      this.floorPlanService
        .update(editing.id, body)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.snackBar.open('Floor updated', 'Close', { duration: 2000 });
            this.editingFloor.set(null);
            this.loadData();
          },
          error: () => this.snackBar.open('Failed to update floor', 'Close', { duration: 3000 }),
        });
    } else {
      this.floorPlanService
        .create(body)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (created) => {
            this.snackBar.open('Floor created', 'Close', { duration: 2000 });
            this.editingFloor.set(null);
            this.loadData();
            // Auto-select the new floor
            setTimeout(() => this.selectFloor(created), 100);
          },
          error: () => this.snackBar.open('Failed to create floor', 'Close', { duration: 3000 }),
        });
    }
  }

  deleteFloor(floor: FloorPlan, event: Event) {
    event.stopPropagation();
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Floor',
        message: `Delete "${floor.name}"? All equipment on this floor will become unassigned.`,
        confirmText: 'Delete',
        confirmColor: 'warn',
      } as ConfirmDialogData,
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.floorPlanService
          .delete(floor.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snackBar.open('Floor deleted', 'Close', { duration: 2000 });
              if (this.selectedFloor()?.id === floor.id) {
                this.selectedFloor.set(null);
                this.canvasEquipment.set([]);
              }
              this.loadData();
            },
            error: () =>
              this.snackBar.open('Failed to delete floor', 'Close', { duration: 3000 }),
          });
      }
    });
  }

  // --- Drag from sidebar onto canvas ---

  onSidebarDragStart(event: DragEvent, eq: FloorPlanEquipment) {
    this.draggingEquipment = eq;
    event.dataTransfer?.setData('text/plain', String(eq.id));
  }

  onCanvasDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onCanvasDrop(event: DragEvent) {
    event.preventDefault();
    if (!this.draggingEquipment || !this.canvasRef) return;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const eq = this.draggingEquipment;
    const newCanvasEq: CanvasEquipment = {
      ...eq,
      canvasX: Math.max(20, Math.min(x, this.selectedFloor()!.width - 20)),
      canvasY: Math.max(20, Math.min(y, this.selectedFloor()!.height - 20)),
      isDirty: true,
      floorPlanId: this.selectedFloor()!.id,
    };

    this.canvasEquipment.update((list) => [...list, newCanvasEq]);
    this.unassignedEquipment.update((list) => list.filter((e) => e.id !== eq.id));
    this.draggingEquipment = null;
  }

  // --- Drag existing equipment on canvas ---

  startDragOnCanvas(event: MouseEvent, eq: CanvasEquipment) {
    event.preventDefault();
    this.activeDragEq = eq;

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.dragOffsetX = event.clientX - rect.left - eq.canvasX;
    this.dragOffsetY = event.clientY - rect.top - eq.canvasY;

    const onMove = (e: MouseEvent) => {
      if (!this.activeDragEq) return;
      const newX = e.clientX - rect.left - this.dragOffsetX;
      const newY = e.clientY - rect.top - this.dragOffsetY;
      const floor = this.selectedFloor()!;
      const clampedX = Math.max(20, Math.min(newX, floor.width - 20));
      const clampedY = Math.max(20, Math.min(newY, floor.height - 20));

      this.canvasEquipment.update((list) =>
        list.map((item) =>
          item.id === this.activeDragEq!.id
            ? { ...item, canvasX: clampedX, canvasY: clampedY, isDirty: true }
            : item
        )
      );
    };

    const onUp = () => {
      this.activeDragEq = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  removeFromFloor(eq: CanvasEquipment, event: Event) {
    event.stopPropagation();
    this.canvasEquipment.update((list) => list.filter((e) => e.id !== eq.id));
    this.unassignedEquipment.update((list) => [
      ...list,
      { ...eq, floorX: null, floorY: null, floorPlanId: null },
    ]);

    // If the equipment was previously saved on this floor, remove it from the backend too
    if (!eq.isDirty && this.selectedFloor()) {
      this.floorPlanService
        .removeEquipmentFromFloor(this.selectedFloor()!.id, eq.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }
  }

  savePositions() {
    const floor = this.selectedFloor();
    if (!floor) return;

    this.saving.set(true);

    const positions: EquipmentPosition[] = this.canvasEquipment().map((eq) => ({
      equipmentId: eq.id,
      floorX: Math.round(eq.canvasX),
      floorY: Math.round(eq.canvasY),
      floorLabel: eq.floorLabel ?? undefined,
    }));

    this.floorPlanService
      .updateEquipmentPositions(floor.id, positions)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.snackBar.open('Positions saved!', 'Close', { duration: 2000 });
          // Mark all as clean
          this.canvasEquipment.update((list) =>
            list.map((eq) => ({ ...eq, isDirty: false }))
          );
          // Refresh floors list
          this.loadData();
        },
        error: () => {
          this.saving.set(false);
          this.snackBar.open('Failed to save positions', 'Close', { duration: 3000 });
        },
      });
  }
}
