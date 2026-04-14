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
import { MatChipsModule } from '@angular/material/chips';
import { NgIf } from '@angular/common';
import { User, CreateUserRequest, UpdateUserRolesRequest } from '../../../core/models/user.model';

export interface UserFormData {
  user?: User; // undefined = create mode, defined = edit roles mode
}

export type UserFormResult = CreateUserRequest | UpdateUserRolesRequest;

const ALL_ROLES = ['USER', 'ADMIN'];

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatChipsModule,
    NgIf,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit User Roles' : 'Create New User' }}</h2>

    <mat-dialog-content class="min-w-[420px]">
      <form [formGroup]="form" class="flex flex-col gap-4 pt-2">

        <!-- Create-only fields -->
        <ng-container *ngIf="!isEdit">
          <mat-form-field appearance="outline">
            <mat-label>Username</mat-label>
            <input matInput formControlName="username" placeholder="e.g. johndoe" autocomplete="off" />
            @if (form.controls['username'].hasError('required')) {
              <mat-error>Username is required</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" placeholder="john@example.com" autocomplete="off" />
            @if (form.controls['email'].hasError('required')) {
              <mat-error>Email is required</mat-error>
            }
            @if (form.controls['email'].hasError('email')) {
              <mat-error>Enter a valid email address</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput formControlName="password" type="password" autocomplete="new-password" />
            @if (form.controls['password'].hasError('required')) {
              <mat-error>Password is required</mat-error>
            }
            @if (form.controls['password'].hasError('minlength')) {
              <mat-error>Password must be at least 6 characters</mat-error>
            }
          </mat-form-field>
        </ng-container>

        <!-- Edit info banner -->
        <ng-container *ngIf="isEdit">
          <div class="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600">
            Editing roles for <span class="font-semibold text-gray-800">{{ data.user?.username }}</span>
            <span class="text-gray-400 ml-1">({{ data.user?.email }})</span>
          </div>
        </ng-container>

        <!-- Roles — shown in both modes -->
        <mat-form-field appearance="outline">
          <mat-label>Roles</mat-label>
          <mat-select formControlName="roles" multiple>
            @for (role of allRoles; track role) {
              <mat-option [value]="role">{{ role }}</mat-option>
            }
          </mat-select>
          @if (form.controls['roles'].hasError('required')) {
            <mat-error>At least one role is required</mat-error>
          }
          <mat-hint>Select one or more roles for this user</mat-hint>
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
        {{ isEdit ? 'Save Roles' : 'Create User' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class UserFormComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<UserFormComponent>);
  readonly data = inject<UserFormData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);

  allRoles = ALL_ROLES;
  form!: FormGroup;

  get isEdit(): boolean {
    return !!this.data.user;
  }

  ngOnInit(): void {
    if (this.isEdit) {
      // Edit mode — only roles field
      this.form = this.fb.group({
        roles: [this.data.user?.roles ?? ['USER'], Validators.required],
      });
    } else {
      // Create mode — full fields
      this.form = this.fb.group({
        username: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        roles: [['USER'], Validators.required],
      });
    }
  }

  submit(): void {
    if (this.form.invalid) return;

    if (this.isEdit) {
      this.dialogRef.close({ roles: this.form.value.roles } as UpdateUserRolesRequest);
    } else {
      this.dialogRef.close(this.form.value as CreateUserRequest);
    }
  }
}