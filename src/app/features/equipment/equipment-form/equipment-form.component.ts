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
import {
  Equipment,
  EquipmentStatus,
  CreateEquipmentRequest,
} from '../../../core/models/equipment.model';

export interface EquipmentFormData {
  equipment?: Equipment;
}

@Component({
  selector: 'app-equipment-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit Equipment' : 'Add Equipment' }}</h2>
    <mat-dialog-content class="min-w-[400px]">
      <form [formGroup]="form" class="flex flex-col gap-4 pt-2">
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Treadmill #1" />
          @if (form.controls['name'].hasError('required')) {
            <mat-error>Name is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Code (QR Identifier)</mat-label>
          <input matInput formControlName="code" placeholder="e.g. TRM-001" />
          <mat-hint>Unique identifier used for QR check-in/out</mat-hint>
          @if (form.controls['code'].hasError('required')) {
            <mat-error>Code is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select formControlName="status">
            @for (s of statuses; track s) {
              <mat-option [value]="s">{{ s }}</mat-option>
            }
          </mat-select>
          @if (form.controls['status'].hasError('required')) {
            <mat-error>Status is required</mat-error>
          }
        </mat-form-field>
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
        {{ isEdit ? 'Save Changes' : 'Add Equipment' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class EquipmentFormComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<EquipmentFormComponent>);
  readonly data = inject<EquipmentFormData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);

  statuses: EquipmentStatus[] = ['Available', 'In Use', 'Reserved'];
  form!: FormGroup;

  get isEdit(): boolean {
    return !!this.data.equipment;
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [this.data.equipment?.name ?? '', Validators.required],
      code: [this.data.equipment?.code ?? '', Validators.required],
      status: [this.data.equipment?.status ?? 'Available', Validators.required],
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.value as CreateEquipmentRequest);
  }
}
