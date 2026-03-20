import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <div class="p-6">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Users</mat-card-title>
          <mat-card-subtitle>Manage gym members</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content class="pt-4">
          <p class="text-gray-500">User management coming soon.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class UsersComponent {}
