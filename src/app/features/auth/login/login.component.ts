import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NgIf } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    NgIf
  ],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-indigo-900 to-indigo-700 flex items-center justify-center p-4">
      <mat-card class="w-full max-w-md shadow-2xl">
        <mat-card-header class="pb-2 pt-6 px-6">
          <div class="flex flex-col items-center w-full mb-4">
            <div class="flex items-center gap-2 mb-3">
              <mat-icon class="text-indigo-600 text-4xl" style="font-size:40px;width:40px;height:40px;">fitness_center</mat-icon>
              <span class="text-2xl font-bold text-gray-800">UREC Live</span>
            </div>
            <h2 class="text-lg text-gray-500 font-medium">Admin Dashboard</h2>
          </div>
        </mat-card-header>

        <mat-card-content class="px-6 pb-4">
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Username</mat-label>
              <input matInput formControlName="username" type="text" placeholder="admin" autocomplete="username" />
              <mat-icon matSuffix>person</mat-icon>
              <mat-error *ngIf="loginForm.get('username')?.hasError('required')">Username is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" [type]="hidePassword ? 'password' : 'text'" autocomplete="current-password" />
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword" [attr.aria-label]="'Toggle password visibility'">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="loginForm.get('password')?.hasError('required')">Password is required</mat-error>
            </mat-form-field>

            <div *ngIf="errorMessage" class="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {{ errorMessage }}
            </div>

            <button mat-raised-button color="primary" type="submit"
                    [disabled]="loginForm.invalid || loading"
                    class="w-full h-12 text-base font-medium mt-2">
              <mat-spinner *ngIf="loading" diameter="20" class="inline-block mr-2"></mat-spinner>
              {{ loading ? 'Signing in...' : 'Sign In' }}
            </button>

          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  loginForm: FormGroup = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  loading = false;
  hidePassword = true;
  errorMessage = '';

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';

    const { username, password } = this.loginForm.value;

    this.authService.login(username, password).subscribe({
      next: () => {
        this.authService.verifyAdminAccess().subscribe({
          next: () => {
            this.loading = false;
            this.router.navigate(['/dashboard']);
          },
          error: (err) => {
            this.loading = false;
            if (err.status === 403) {
              this.errorMessage = 'Access denied. Admin role required.';
              this.authService.logout();
            } else {
              this.errorMessage = 'Could not verify admin access. Please try again.';
            }
          }
        });
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 401 || err.status === 400) {
          this.errorMessage = 'Invalid username or password.';
        } else {
          this.snackBar.open('Network error. Please check your connection.', 'Dismiss', { duration: 4000 });
        }
      }
    });
  }
}
