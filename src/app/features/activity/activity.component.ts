import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <div class="p-6">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Activity Log</mat-card-title>
          <mat-card-subtitle>Recent check-ins and check-outs</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="pt-4">
          <p class="text-gray-500">Activity log coming soon.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class ActivityComponent {}
