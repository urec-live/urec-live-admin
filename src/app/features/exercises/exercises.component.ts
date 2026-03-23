import {
  Component,
  inject,
  OnInit,
  AfterViewInit,
  ViewChild,
  signal,
  DestroyRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of, Observable } from 'rxjs';
import { Exercise } from '../../core/models/exercise.model';
import { Equipment } from '../../core/models/equipment.model';
import { ExerciseService } from '../../core/services/exercise.service';
import { EquipmentService } from '../../core/services/equipment.service';
import {
  ExerciseFormComponent,
  ExerciseFormData,
  ExerciseFormResult,
} from './exercise-form/exercise-form.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';

interface FilterState {
  search: string;
  muscleGroup: string;
}

const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Core',
  'Legs',
  'Glutes',
  'Cardio',
  'Full Body',
  'Flexibility',
];

@Component({
  selector: 'app-exercises',
  standalone: true,
  imports: [
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatCardModule,
  ],
  template: `
    <div class="p-6 max-w-screen-xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-semibold text-gray-800">Exercises</h1>
          <p class="text-sm text-gray-500 mt-0.5">Manage the exercise library</p>
        </div>
        <button mat-flat-button color="primary" (click)="openAdd()">
          <mat-icon>add</mat-icon>
          Add Exercise
        </button>
      </div>

      <!-- Filter bar -->
      <mat-card class="mb-4">
        <mat-card-content class="!flex flex-wrap items-center gap-3 !py-3">
          <mat-form-field appearance="outline" class="flex-1 min-w-[200px] !mb-0">
            <mat-label>Search</mat-label>
            <input
              matInput
              [(ngModel)]="searchTerm"
              (ngModelChange)="applyFilter()"
              placeholder="Exercise name…"
            />
            <mat-icon matSuffix class="text-gray-400">search</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-48 !mb-0">
            <mat-label>Muscle Group</mat-label>
            <mat-select [(ngModel)]="muscleGroupFilter" (ngModelChange)="applyFilter()">
              <mat-option value="">All</mat-option>
              @for (mg of muscleGroups; track mg) {
                <mat-option [value]="mg">{{ mg }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </mat-card-content>
      </mat-card>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-16">
          <mat-spinner diameter="48" />
        </div>
      }

      <!-- Table -->
      @if (!loading()) {
        <mat-card class="overflow-hidden">
          <table mat-table [dataSource]="dataSource" matSort class="w-full">
            <!-- Name column -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
              <td mat-cell *matCellDef="let e">
                <span class="font-medium text-gray-800">{{ e.name }}</span>
              </td>
            </ng-container>

            <!-- Muscle Group column -->
            <ng-container matColumnDef="muscleGroup">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Muscle Group</th>
              <td mat-cell *matCellDef="let e">
                <span class="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-medium">
                  {{ e.muscleGroup }}
                </span>
              </td>
            </ng-container>

            <!-- GIF Preview column -->
            <ng-container matColumnDef="gifPreview">
              <th mat-header-cell *matHeaderCellDef>Preview</th>
              <td mat-cell *matCellDef="let e">
                @if (e.gifUrl) {
                  <img
                    [src]="e.gifUrl"
                    alt="{{ e.name }}"
                    class="h-10 w-10 rounded object-cover"
                  />
                } @else {
                  <span class="text-gray-400">—</span>
                }
              </td>
            </ng-container>

            <!-- Linked Equipment column -->
            <ng-container matColumnDef="linkedEquipment">
              <th mat-header-cell *matHeaderCellDef>Linked Machines</th>
              <td mat-cell *matCellDef="let e">
                @if (e.linkedEquipment?.length > 0) {
                  <span
                    class="text-xs bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full font-medium cursor-help"
                    [matTooltip]="getMachineNames(e)"
                    matTooltipClass="whitespace-pre-line"
                  >
                    {{ e.linkedEquipment.length }}
                    {{ e.linkedEquipment.length === 1 ? 'machine' : 'machines' }}
                  </span>
                } @else {
                  <span class="text-gray-400">—</span>
                }
              </td>
            </ng-container>

            <!-- Actions column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="w-24"></th>
              <td mat-cell *matCellDef="let e">
                <div class="flex items-center">
                  <button mat-icon-button matTooltip="Edit" (click)="openEdit(e)">
                    <mat-icon class="!text-[20px] text-gray-400">edit</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Delete" (click)="openDelete(e)">
                    <mat-icon class="!text-[20px] text-red-400">delete</mat-icon>
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns" class="bg-gray-50"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: columns"
              class="hover:bg-gray-50 transition-colors"
            ></tr>

            <tr class="mat-row" *matNoDataRow>
              <td
                class="mat-cell py-12 text-center text-gray-400"
                [attr.colspan]="columns.length"
              >
                @if (searchTerm || muscleGroupFilter) {
                  No exercises match your filters.
                } @else {
                  No exercises found.
                }
              </td>
            </tr>
          </table>

          <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons />
        </mat-card>
      }
    </div>
  `,
})
export class ExercisesComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private exerciseService = inject(ExerciseService);
  private equipmentService = inject(EquipmentService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  columns = ['name', 'muscleGroup', 'gifPreview', 'linkedEquipment', 'actions'];
  muscleGroups = MUSCLE_GROUPS;

  loading = signal(false);
  dataSource = new MatTableDataSource<Exercise>([]);
  allEquipment: Equipment[] = [];

  searchTerm = '';
  muscleGroupFilter = '';

  ngOnInit(): void {
    this.dataSource.filterPredicate = (data: Exercise, filter: string) => {
      const f = JSON.parse(filter) as FilterState;
      const matchesSearch =
        !f.search || data.name.toLowerCase().includes(f.search);
      const matchesMuscleGroup =
        !f.muscleGroup || data.muscleGroup === f.muscleGroup;
      return matchesSearch && matchesMuscleGroup;
    };

    this.loading.set(true);
    this.exerciseService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (exercises) => {
          this.dataSource.data = exercises;
          this.loading.set(false);
        },
        error: () => {
          this.snackBar.open('Failed to load exercises', 'Dismiss', { duration: 3000 });
          this.loading.set(false);
        },
      });

    this.equipmentService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (equipment) => {
          this.allEquipment = equipment.filter((e) => !e.deleted);
        },
        error: () => {
          this.snackBar.open('Failed to load equipment list', 'Dismiss', { duration: 3000 });
        },
      });

  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadExercises(): void {
    this.exerciseService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (exercises) => {
          this.dataSource.data = exercises;
        },
        error: () =>
          this.snackBar.open('Failed to reload exercises', 'Dismiss', { duration: 3000 }),
      });
  }

  getMachineNames(exercise: Exercise): string {
    return (exercise.linkedEquipment ?? []).map((m) => m.name).join('\n');
  }

  applyFilter(): void {
    this.dataSource.filter = JSON.stringify({
      search: this.searchTerm.toLowerCase().trim(),
      muscleGroup: this.muscleGroupFilter,
    } satisfies FilterState);
    this.dataSource.paginator?.firstPage();
  }

  openAdd(): void {
    this.dialog
      .open(ExerciseFormComponent, {
        data: { exercise: undefined, allEquipment: this.allEquipment } as ExerciseFormData,
        width: '480px',
      })
      .afterClosed()
      .subscribe((result: ExerciseFormResult | undefined) => {
        if (!result) return;
        const { linkedEquipmentIds, ...exerciseData } = result;
        this.exerciseService
          .create(exerciseData)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (created) => {
              if (linkedEquipmentIds.length > 0) {
                this.exerciseService
                  .linkEquipment(created.id, linkedEquipmentIds)
                  .pipe(takeUntilDestroyed(this.destroyRef))
                  .subscribe({ next: () => this.loadExercises() });
              } else {
                this.loadExercises();
              }
              this.snackBar.open('Exercise added', undefined, { duration: 2000 });
            },
            error: () =>
              this.snackBar.open('Failed to add exercise', 'Dismiss', { duration: 3000 }),
          });
      });
  }

  openEdit(exercise: Exercise): void {
    this.dialog
      .open(ExerciseFormComponent, {
        data: { exercise, allEquipment: this.allEquipment } as ExerciseFormData,
        width: '480px',
      })
      .afterClosed()
      .subscribe((result: ExerciseFormResult | undefined) => {
        if (!result) return;
        const { linkedEquipmentIds, ...exerciseData } = result;

        this.exerciseService
          .update(exercise.id, exerciseData)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.syncLinkedEquipment(exercise, linkedEquipmentIds);
              this.snackBar.open('Exercise updated', undefined, { duration: 2000 });
            },
            error: () =>
              this.snackBar.open('Failed to update exercise', 'Dismiss', { duration: 3000 }),
          });
      });
  }

  private syncLinkedEquipment(exercise: Exercise, newIds: number[]): void {
    const oldIds = new Set((exercise.linkedEquipment ?? []).map((e) => e.id));
    const newIdSet = new Set(newIds);

    const toAdd = newIds.filter((id) => !oldIds.has(id));
    const toRemove = [...oldIds].filter((id) => !newIdSet.has(id));

    const ops = [
      ...(toAdd.length > 0
        ? [this.exerciseService.linkEquipment(exercise.id, toAdd)]
        : []),
      ...toRemove.map((id) => this.exerciseService.unlinkEquipment(exercise.id, id)),
    ];

    const stream: Observable<unknown> = ops.length > 0 ? forkJoin(ops) : of(null);
    stream
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.loadExercises() });
  }

  openDelete(exercise: Exercise): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Delete Exercise',
          message: `Are you sure you want to delete "${exercise.name}"? This cannot be undone.`,
          confirmLabel: 'Delete',
          danger: true,
        } as ConfirmDialogData,
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.exerciseService
          .delete(exercise.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snackBar.open('Exercise deleted', undefined, { duration: 2000 });
              this.loadExercises();
            },
            error: () =>
              this.snackBar.open('Failed to delete exercise', 'Dismiss', { duration: 3000 }),
          });
      });
  }
}
