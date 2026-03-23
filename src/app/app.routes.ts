import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () =>
      import('./shared/components/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard-home/dashboard-home.component').then(m => m.DashboardHomeComponent)
      },
      {
        path: 'equipment',
        loadComponent: () =>
          import('./features/equipment/equipment-list/equipment-list.component').then(m => m.EquipmentListComponent)
      },
      {
        path: 'exercises',
        loadComponent: () =>
          import('./features/exercises/exercises.component').then(m => m.ExercisesComponent)
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/users.component').then(m => m.UsersComponent)
      },
      {
        path: 'activity',
        loadComponent: () =>
          import('./features/activity/activity.component').then(m => m.ActivityComponent)
      },
      {
        path: 'live-monitor',
        loadComponent: () =>
          import('./features/dashboard/live-monitor/live-monitor.component').then(m => m.LiveMonitorComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
