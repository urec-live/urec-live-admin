import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <div class="p-6">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Dashboard</mat-card-title>
          <mat-card-subtitle>Live gym overview</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="pt-4">
          <p class="text-gray-500">Analytics and live monitor coming soon.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class DashboardHomeComponent {}
