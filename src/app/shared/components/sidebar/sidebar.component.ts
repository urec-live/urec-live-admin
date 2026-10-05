import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatListModule, MatIconModule],
  template: `
    <div class="flex flex-col h-full bg-indigo-900 text-white">
      <!-- Brand -->
      <div class="flex items-center gap-2 px-4 py-5 border-b border-indigo-700">
        <mat-icon class="text-indigo-300">fitness_center</mat-icon>
        <span class="text-lg font-semibold tracking-wide">UREC Live</span>
        <span class="text-xs text-indigo-400 ml-1">Admin</span>
      </div>

      <!-- Nav Links -->
      <mat-nav-list class="flex-1 pt-2">
        @for (item of navItems; track item.route) {
          <a mat-list-item
             [routerLink]="item.route"
             routerLinkActive="bg-indigo-700"
             class="rounded-lg mx-2 mb-1 text-white hover:bg-indigo-800 transition-colors">
            <mat-icon matListItemIcon class="text-indigo-300">{{ item.icon }}</mat-icon>
            <span matListItemTitle>{{ item.label }}</span>
            @if (item.route === helpRoute && helpBadge > 0) {
              <span matListItemMeta
                    class="!self-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-400 text-indigo-950 text-xs font-semibold flex items-center justify-center"
                    data-testid="help-badge"
                    [attr.aria-label]="helpBadge + (helpBadge === 1 ? ' member needs' : ' members need') + ' staff'">
                {{ helpBadge }}
              </span>
            }
          </a>
        }
      </mat-nav-list>

      <!-- Footer -->
      <div class="px-4 py-3 border-t border-indigo-700 text-xs text-indigo-400">
        UREC Live &copy; 2025
      </div>
    </div>
  `
})
export class SidebarComponent {
  /** Members waiting for staff (new + "Too busy"), from the shell's HelpRequestStore. */
  @Input() helpBadge = 0;

  readonly helpRoute = '/help-requests';

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Help Requests', icon: 'support_agent', route: this.helpRoute },
    // { label: 'Live Monitor', icon: 'monitor_heart', route: '/live-monitor' },
    { label: 'Equipment', icon: 'fitness_center', route: '/equipment' },
    { label: 'Floor Map', icon: 'layers', route: '/floor-map' },
    { label: 'Exercises', icon: 'directions_run', route: '/exercises' },
    { label: 'Users', icon: 'group', route: '/users' },
    { label: 'Activity', icon: 'history', route: '/activity' }
  ];
}
