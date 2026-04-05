import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ViewChild,
  signal,
  DestroyRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DatePipe, NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { ActivityService } from '../../core/services/activity.service';
import { ActivityLogEntry, ActivitySummary } from '../../core/models/activity.model';

const EVENT_TYPES = ['CHECK_IN', 'CHECK_OUT', 'SESSION_SAVED', 'REGISTRATION',
                     'ADMIN_CREATE_USER', 'ADMIN_UPDATE_ROLES', 'ADMIN_DELETE_USER'];

const DATE_PRESETS = [
  { label: 'Today',      value: 'today' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'All time',   value: '' },
];

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatCardModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    DatePipe,
    NgClass,
  ],
  template: `
    <div class="p-6 max-w-screen-xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-semibold text-gray-800">Activity Log</h1>
          <p class="text-sm text-gray-500 mt-0.5">Recent check-ins, check-outs and system events</p>
        </div>
        <div class="flex items-center gap-3">
          <!-- Auto-refresh toggle -->
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <mat-slide-toggle
              [(ngModel)]="autoRefresh"
              (ngModelChange)="toggleAutoRefresh()"
              color="primary">
            </mat-slide-toggle>
            <span>Auto-refresh</span>
            @if (autoRefresh) {
              <span class="flex items-center gap-1 text-indigo-600 text-xs font-medium">
                <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse inline-block"></span>
                Live
              </span>
            }
          </div>
          <!-- Manual refresh -->
          <button mat-icon-button matTooltip="Refresh now" (click)="loadAll()" [disabled]="loading()">
            <mat-icon [class.animate-spin]="loading()">refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- Stats summary bar -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <mat-card class="!py-4 !px-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <mat-icon class="text-green-600">login</mat-icon>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-800">{{ summary()?.checkInsToday ?? '—' }}</p>
              <p class="text-xs text-gray-500">Check-ins today</p>
            </div>
          </div>
        </mat-card>

        <mat-card class="!py-4 !px-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <mat-icon class="text-blue-600">logout</mat-icon>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-800">{{ summary()?.checkOutsToday ?? '—' }}</p>
              <p class="text-xs text-gray-500">Check-outs today</p>
            </div>
          </div>
        </mat-card>

        <mat-card class="!py-4 !px-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <mat-icon class="text-indigo-600">fitness_center</mat-icon>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-800">{{ summary()?.sessionsToday ?? '—' }}</p>
              <p class="text-xs text-gray-500">Sessions today</p>
            </div>
          </div>
        </mat-card>

        <mat-card class="!py-4 !px-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <mat-icon class="text-purple-600">person_add</mat-icon>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-800">{{ summary()?.registrationsToday ?? '—' }}</p>
              <p class="text-xs text-gray-500">Registrations today</p>
            </div>
          </div>
        </mat-card>
      </div>

      <!-- Filter bar -->
      <mat-card class="mb-4">
        <mat-card-content class="!flex flex-wrap items-center gap-3 !py-3">

          <!-- Search -->
          <mat-form-field appearance="outline" class="flex-1 min-w-[180px] !mb-0">
            <mat-label>Search</mat-label>
            <input matInput [(ngModel)]="search" (ngModelChange)="onFilterChange()"
                   placeholder="Username, description…" />
            <mat-icon matSuffix class="text-gray-400">search</mat-icon>
          </mat-form-field>

          <!-- Event type -->
          <mat-form-field appearance="outline" class="w-48 !mb-0">
            <mat-label>Event type</mat-label>
            <mat-select [(ngModel)]="eventTypeFilter" (ngModelChange)="onFilterChange()">
              <mat-option value="">All events</mat-option>
              @for (et of eventTypes; track et) {
                <mat-option [value]="et">{{ formatEventType(et) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <!-- Date range preset -->
          <mat-form-field appearance="outline" class="w-36 !mb-0">
            <mat-label>Date range</mat-label>
            <mat-select [(ngModel)]="datePreset" (ngModelChange)="onPresetChange()">
              @for (p of datePresets; track p.value) {
                <mat-option [value]="p.value">{{ p.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <!-- Clear filters -->
          @if (search || eventTypeFilter || datePreset) {
            <button mat-stroked-button (click)="clearFilters()" class="!h-14 shrink-0">
              <mat-icon>clear</mat-icon>
              Clear
            </button>
          }

        </mat-card-content>
      </mat-card>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-16">
          <mat-spinner diameter="48" />
        </div>
      }

      <!-- Table -->
      @if (!loading()) {
        <mat-card class="overflow-hidden">
          <table mat-table [dataSource]="logs()" class="w-full">

            <!-- Timestamp -->
            <ng-container matColumnDef="timestamp">
              <th mat-header-cell *matHeaderCellDef class="w-44">Time</th>
              <td mat-cell *matCellDef="let e">
                <span class="text-xs text-gray-500 whitespace-nowrap">
                  {{ e.timestamp | date:'MMM d, y, h:mm:ss a' }}
                </span>
              </td>
            </ng-container>

            <!-- Event type -->
            <ng-container matColumnDef="eventType">
              <th mat-header-cell *matHeaderCellDef class="w-44">Event</th>
              <td mat-cell *matCellDef="let e">
                <span [ngClass]="eventClass(e.eventType)"
                      class="px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap">
                  {{ formatEventType(e.eventType) }}
                </span>
              </td>
            </ng-container>

            <!-- Username -->
            <ng-container matColumnDef="username">
              <th mat-header-cell *matHeaderCellDef class="w-36">User</th>
              <td mat-cell *matCellDef="let e">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
                    {{ e.username.charAt(0).toUpperCase() }}
                  </div>
                  <span class="text-sm font-medium text-gray-800">{{ e.username }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Equipment -->
            <ng-container matColumnDef="equipmentName">
              <th mat-header-cell *matHeaderCellDef class="w-36">Equipment</th>
              <td mat-cell *matCellDef="let e">
                @if (e.equipmentName) {
                  <code class="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                    {{ e.equipmentName }}
                  </code>
                } @else {
                  <span class="text-gray-300 text-xs">—</span>
                }
              </td>
            </ng-container>

            <!-- Description -->
            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Description</th>
              <td mat-cell *matCellDef="let e">
                <span class="text-sm text-gray-600">{{ e.description }}</span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns" class="bg-gray-50"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"
                class="hover:bg-gray-50 transition-colors"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell py-12 text-center text-gray-400" [attr.colspan]="columns.length">
                No activity log entries match your filters.
              </td>
            </tr>
          </table>

          <!-- Server-side paginator -->
          <mat-paginator
            [length]="totalElements()"
            [pageSize]="pageSize"
            [pageIndex]="pageIndex()"
            [pageSizeOptions]="[10, 25, 50, 100]"
            showFirstLastButtons
            (page)="onPageChange($event)"
          />
        </mat-card>
      }

    </div>
  `,
})
export class ActivityComponent implements OnInit, OnDestroy {
  private activityService = inject(ActivityService);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private stopRefresh$ = new Subject<void>();

  columns = ['timestamp', 'eventType', 'username', 'equipmentName', 'description'];
  eventTypes = EVENT_TYPES;
  datePresets = DATE_PRESETS;

  // State
  loading = signal(false);
  logs = signal<ActivityLogEntry[]>([]);
  summary = signal<ActivitySummary | null>(null);
  totalElements = signal(0);
  pageIndex = signal(0);
  pageSize = 25;

  // Filters
  search = '';
  eventTypeFilter = '';
  datePreset = 'today';
  autoRefresh = false;

  ngOnInit(): void {
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.stopRefresh$.next();
    this.stopRefresh$.complete();
  }

  loadAll(): void {
    this.loadSummary();
    this.loadLogs();
  }

  loadSummary(): void {
    this.activityService.getSummary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => this.summary.set(s),
        error: () => {} // summary is non-critical, fail silently
      });
  }

  loadLogs(): void {
    this.loading.set(true);
    const { from, to } = this.getDateRange();

    this.activityService.getLogs(
      this.pageIndex(),
      this.pageSize,
      this.eventTypeFilter || undefined,
      this.search.trim() || undefined,
      from,
      to,
    )
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (page) => {
        this.logs.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to load activity log', 'Dismiss', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  onFilterChange(): void {
    this.pageIndex.set(0); // reset to first page on filter change
    this.loadLogs();
  }

  onPresetChange(): void {
    this.pageIndex.set(0);
    this.loadLogs();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize = event.pageSize;
    this.loadLogs();
  }

  clearFilters(): void {
    this.search = '';
    this.eventTypeFilter = '';
    this.datePreset = '';
    this.pageIndex.set(0);
    this.loadLogs();
  }

  toggleAutoRefresh(): void {
    this.stopRefresh$.next(); // stop any existing interval
    if (this.autoRefresh) {
      interval(30_000)
        .pipe(takeUntil(this.stopRefresh$))
        .subscribe(() => this.loadAll());
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private getDateRange(): { from?: string; to?: string } {
    const now = new Date();
    switch (this.datePreset) {
      case 'today': {
        const start = new Date(now);
        start.setUTCHours(0, 0, 0, 0);
        return { from: start.toISOString(), to: now.toISOString() };
      }
      case '7d': {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { from: start.toISOString(), to: now.toISOString() };
      }
      case '30d': {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { from: start.toISOString(), to: now.toISOString() };
      }
      default:
        return {}; // all time — no date filter
    }
  }

  formatEventType(et: string): string {
    const map: Record<string, string> = {
      CHECK_IN:          'Check In',
      CHECK_OUT:         'Check Out',
      SESSION_SAVED:     'Session Saved',
      REGISTRATION:      'Registration',
      ADMIN_CREATE_USER: 'User Created',
      ADMIN_UPDATE_ROLES:'Roles Updated',
      ADMIN_DELETE_USER: 'User Deleted',
    };
    return map[et] ?? et;
  }

  eventClass(et: string): string {
    switch (et) {
      case 'CHECK_IN':          return 'bg-green-100 text-green-700';
      case 'CHECK_OUT':         return 'bg-blue-100 text-blue-700';
      case 'SESSION_SAVED':     return 'bg-indigo-100 text-indigo-700';
      case 'REGISTRATION':      return 'bg-purple-100 text-purple-700';
      case 'ADMIN_CREATE_USER': return 'bg-teal-100 text-teal-700';
      case 'ADMIN_UPDATE_ROLES':return 'bg-amber-100 text-amber-700';
      case 'ADMIN_DELETE_USER': return 'bg-red-100 text-red-700';
      default:                  return 'bg-gray-100 text-gray-600';
    }
  }
}