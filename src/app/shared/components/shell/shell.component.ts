import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { EquipmentIssueStore } from '../../../core/services/equipment-issue-store.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, MatSidenavModule, SidebarComponent, TopbarComponent],
  template: `
    <mat-sidenav-container class="h-screen">
      <!-- The ! matters: Material's own width rule (auto in this theme) loads after Tailwind, and an auto-width
           sidebar grows when a badge appears and covers the page. 18rem fits "Equipment Issues" and its badge. -->
      <mat-sidenav #sidenav mode="side" [opened]="sidenavOpen" class="!w-72" fixedInViewport>
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
export class ShellComponent implements OnInit, OnDestroy {
  /** Watches for new equipment issue reports on every page of the signed-in dashboard. */
  readonly equipmentIssues = inject(EquipmentIssueStore);

  sidenavOpen = true;

  ngOnInit(): void {
    this.equipmentIssues.start();
  }

  ngOnDestroy(): void {
    this.equipmentIssues.stop();
  }
}
