import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-exercises',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <div class="p-6">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Exercises</mat-card-title>
          <mat-card-subtitle>Manage exercise library</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="pt-4">
          <p class="text-gray-500">Exercise management coming soon.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class ExercisesComponent {}
