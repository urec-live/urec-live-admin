import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, MatSidenavModule, SidebarComponent, TopbarComponent],
  template: `
    <mat-sidenav-container class="h-screen">
      <mat-sidenav #sidenav mode="side" [opened]="sidenavOpen" class="w-64" fixedInViewport>
        <app-sidebar />
      </mat-sidenav>

      <mat-sidenav-content class="flex flex-col h-full bg-gray-50">
        <app-topbar (menuToggle)="sidenav.toggle()" />
        <main class="flex-1 overflow-auto">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `
})
export class ShellComponent {
  sidenavOpen = true;
}
