import { Component, EventEmitter, Output, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [MatToolbarModule, MatIconModule, MatButtonModule, MatMenuModule],
  template: `
    <mat-toolbar class="bg-white border-b border-gray-200 shadow-sm">
      <button mat-icon-button (click)="menuToggle.emit()" aria-label="Toggle sidebar">
        <mat-icon>menu</mat-icon>
      </button>

      <span class="flex-1 ml-2 text-gray-700 font-medium text-base">Admin Dashboard</span>

      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600 hidden sm:block">{{ username }}</span>
        <button mat-icon-button [matMenuTriggerFor]="userMenu" aria-label="User menu">
          <mat-icon>account_circle</mat-icon>
        </button>
      </div>

      <mat-menu #userMenu="matMenu">
        <div class="px-4 py-2 border-b border-gray-100">
          <p class="text-sm font-medium text-gray-800">{{ username }}</p>
          <p class="text-xs text-gray-500">{{ email }}</p>
        </div>
        <button mat-menu-item (click)="logout()">
          <mat-icon>logout</mat-icon>
          <span>Sign out</span>
        </button>
      </mat-menu>
    </mat-toolbar>
  `
})
export class TopbarComponent {
  @Output() menuToggle = new EventEmitter<void>();

  private readonly authService = inject(AuthService);

  get username(): string {
    return this.authService.getUsername() ?? 'Admin';
  }

  get email(): string {
    return this.authService.getEmail() ?? '';
  }

  logout(): void {
    this.authService.logout();
  }
}
