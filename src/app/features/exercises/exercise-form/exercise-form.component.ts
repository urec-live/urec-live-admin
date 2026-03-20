import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { Exercise } from '../../../core/models/exercise.model';
import { Equipment } from '../../../core/models/equipment.model';

export interface ExerciseFormData {
  exercise?: Exercise;
  allEquipment: Equipment[];
}

export interface ExerciseFormResult {
  name: string;
  muscleGroup: string;
  gifUrl?: string;
  linkedEquipmentIds: number[];
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
] as const;

@Component({
  selector: 'app-exercise-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit Exercise' : 'Add Exercise' }}</h2>
    <mat-dialog-content class="min-w-[400px]">
      <form [formGroup]="form" class="flex flex-col gap-4 pt-2">
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Bench Press" />
          @if (form.controls['name'].hasError('required')) {
            <mat-error>Name is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Muscle Group</mat-label>
          <mat-select formControlName="muscleGroup">
            @for (mg of muscleGroups; track mg) {
              <mat-option [value]="mg">{{ mg }}</mat-option>
            }
          </mat-select>
          @if (form.controls['muscleGroup'].hasError('required')) {
            <mat-error>Muscle group is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Linked Machines</mat-label>
          <mat-select formControlName="linkedEquipmentIds" multiple>
            <mat-option *ngFor="let eq of allEquipment" [value]="eq.id">
              {{ eq.name }}
            </mat-option>
          </mat-select>
          <mat-hint>{{ allEquipment.length }} machines available</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>GIF URL (optional)</mat-label>
          <input
            matInput
            formControlName="gifUrl"
            placeholder="https://example.com/exercise.gif"
          />
          <mat-hint>Live preview shown below when a valid URL is entered</mat-hint>
        </mat-form-field>

        @if (form.controls['gifUrl'].value) {
          <div class="flex justify-center">
            <img
              [src]="form.controls['gifUrl'].value"
              alt="Exercise preview"
              class="h-32 w-auto rounded border border-gray-200 object-contain"
              (error)="onImgError($event)"
            />
          </div>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button
        mat-flat-button
        color="primary"
        (click)="submit()"
        [disabled]="form.invalid"
      >
        {{ isEdit ? 'Save Changes' : 'Add Exercise' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ExerciseFormComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<ExerciseFormComponent>);
  readonly data = inject<ExerciseFormData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);

  muscleGroups = MUSCLE_GROUPS;
  allEquipment: Equipment[] = [];
  form!: FormGroup;

  get isEdit(): boolean {
    return !!this.data.exercise;
  }

  ngOnInit(): void {
    this.allEquipment = this.data.allEquipment ?? [];
    const currentLinkedIds = (this.data.exercise?.linkedEquipment ?? []).map((e) => e.id);
    this.form = this.fb.group({
      name: [this.data.exercise?.name ?? '', Validators.required],
      muscleGroup: [this.data.exercise?.muscleGroup ?? '', Validators.required],
      linkedEquipmentIds: [currentLinkedIds],
      gifUrl: [this.data.exercise?.gifUrl ?? ''],
    });
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  submit(): void {
    if (this.form.invalid) return;
    const { name, muscleGroup, gifUrl, linkedEquipmentIds } = this.form.value;
    const result: ExerciseFormResult = {
      name,
      muscleGroup,
      linkedEquipmentIds: linkedEquipmentIds ?? [],
    };
    if (gifUrl) result.gifUrl = gifUrl;
    this.dialogRef.close(result);
  }
}
