import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, interval } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HelpRequestStore } from '../../core/services/help-request-store.service';
import { HelpRequestService } from '../../core/services/help-request.service';
import { ChimeService } from '../../core/services/chime.service';
import {
  HELP_STATUS_LABELS,
  HelpRequest,
  HelpRequestStatus,
  StaffResponse,
  outcomeLabel,
} from '../../core/models/help-request.model';

/** How often the "Waiting N min" labels tick over. */
export const CLOCK_TICK_MS = 15_000;
export const HISTORY_LIMIT = 50;

const STATUS_CLASSES: Record<HelpRequestStatus, string> = {
  REQUEST_RECEIVED: 'bg-blue-100 text-blue-700',
  ON_THE_WAY: 'bg-green-100 text-green-700',
  TOO_BUSY: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
  EXPIRED: 'bg-gray-100 text-gray-600',
};

/** "less than a minute" (also for clock skew), "12 min" or "1 h 5 min" */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'less than a minute';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/**
 * Staff's live queue of members who pressed "Call staff" at a machine. The queue itself comes from
 * HelpRequestStore, which the shell keeps polling (and chiming) on every page.
 */
@Component({
  selector: 'app-help-requests',
  standalone: true,
  imports: [
    DatePipe,
    NgClass,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="p-6 max-w-screen-xl mx-auto">

      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 class="text-2xl font-semibold text-gray-800">Help Requests</h1>
          <p class="text-sm text-gray-500 mt-0.5">Members who pressed Call staff at a machine. Updates every few seconds.</p>
        </div>
        <div class="flex items-center gap-4">
          <mat-slide-toggle color="primary" [checked]="!chime.muted()" (change)="setSound($event.checked)"
                            data-testid="sound-toggle">
            Sound
          </mat-slide-toggle>
          <button mat-stroked-button (click)="toggleHistory()" data-testid="history-toggle">
            <mat-icon>history</mat-icon>
            {{ showHistory() ? 'Hide recently closed' : 'Recently closed' }}
          </button>
        </div>
      </div>

      <!-- Stat cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        @for (card of stats(); track card.key) {
          <mat-card class="!py-4 !px-5" [attr.data-testid]="'stat-' + card.key">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center" [ngClass]="card.tone">
                <mat-icon>{{ card.icon }}</mat-icon>
              </div>
              <div>
                <p class="text-2xl font-bold text-gray-800">{{ card.count }}</p>
                <p class="text-xs text-gray-500">{{ card.label }}</p>
              </div>
            </div>
          </mat-card>
        }
      </div>

      <!-- Open queue, longest waiting first -->
      @if (!store.loaded()) {
        <div class="flex justify-center py-16" data-testid="loading"><mat-spinner diameter="40" /></div>
      } @else if (queue().length === 0) {
        <mat-card class="!py-12 text-center" data-testid="empty-queue">
          <mat-icon class="text-gray-300">support_agent</mat-icon>
          <p class="text-lg font-medium text-gray-700 mt-2">No one needs help right now</p>
          <p class="text-sm text-gray-500">New requests show up here with a chime.</p>
        </mat-card>
      } @else {
        <div class="space-y-3">
          @for (request of queue(); track request.id) {
            <mat-card class="!p-4" [attr.data-testid]="'request-' + request.id">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-lg font-semibold text-gray-800">{{ request.equipmentName }}</span>
                    @if (request.equipmentCode) {
                      <span class="text-xs font-mono text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">{{ request.equipmentCode }}</span>
                    }
                    <span class="text-xs font-medium rounded-full px-2 py-0.5" [ngClass]="statusClass(request.status)"
                          data-testid="status">{{ statusLabel(request.status) }}</span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1" data-testid="details">
                    {{ request.memberUsername }}
                    @if (request.exerciseName) { · {{ request.exerciseName }} }
                    @if (request.floorLabel) { · {{ request.floorLabel }} }
                  </p>
                  <p class="text-sm text-gray-500 mt-1">
                    <span data-testid="waiting">Waiting {{ waitingFor(request) }}</span>
                    @if (request.status === 'ON_THE_WAY' && request.staffUsername) {
                      · <span class="text-green-700" data-testid="responder">{{ request.staffUsername }} is on the way</span>
                    }
                  </p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button mat-flat-button color="primary" data-testid="on-the-way"
                          [disabled]="isSaving(request.id)" (click)="respond(request, 'ON_THE_WAY')">On the way</button>
                  <button mat-stroked-button data-testid="too-busy"
                          [disabled]="isSaving(request.id)" (click)="respond(request, 'TOO_BUSY')">Too busy</button>
                  <button mat-stroked-button color="primary" data-testid="done"
                          [disabled]="isSaving(request.id)" (click)="markDone(request)">Done helping</button>
                </div>
              </div>
            </mat-card>
          }
        </div>
      }

      <!-- Recently closed -->
      @if (showHistory()) {
        <h2 class="text-lg font-semibold text-gray-800 mt-8 mb-3">Recently closed</h2>
        @if (historyLoading()) {
          <div class="flex justify-center py-8"><mat-spinner diameter="32" /></div>
        } @else if (history().length === 0) {
          <p class="text-sm text-gray-500" data-testid="history-empty">Nothing has been closed yet.</p>
        } @else {
          <mat-card class="!p-0 overflow-x-auto">
            <table class="w-full text-sm" data-testid="history">
              <thead class="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th class="px-4 py-2">Machine</th>
                  <th class="px-4 py-2">Member</th>
                  <th class="px-4 py-2">Outcome</th>
                  <th class="px-4 py-2">First response</th>
                  <th class="px-4 py-2">Closed</th>
                </tr>
              </thead>
              <tbody>
                @for (request of history(); track request.id) {
                  <tr class="border-t border-gray-100">
                    <td class="px-4 py-2">{{ request.equipmentName }}</td>
                    <td class="px-4 py-2">{{ request.memberUsername }}</td>
                    <td class="px-4 py-2">
                      <span class="text-xs font-medium rounded-full px-2 py-0.5"
                            [ngClass]="statusClass(request.status)">{{ outcome(request) }}</span>
                    </td>
                    <td class="px-4 py-2">{{ responseTime(request) }}</td>
                    <td class="px-4 py-2 text-gray-500">{{ request.closedAt | date: 'MMM d, h:mm a' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </mat-card>
        }
      }
    </div>
  `,
})
export class HelpRequestsComponent implements OnInit {
  readonly store = inject(HelpRequestStore);
  readonly chime = inject(ChimeService);
  private service = inject(HelpRequestService);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  /** Ticks every CLOCK_TICK_MS so the waiting times stay current between polls. */
  readonly now = signal(Date.now());
  /** Requests with a save in flight; their buttons are disabled. */
  readonly saving = signal<ReadonlySet<number>>(new Set());
  readonly showHistory = signal(false);
  readonly history = signal<HelpRequest[]>([]);
  readonly historyLoading = signal(false);

  readonly queue = computed(() =>
    [...this.store.requests()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)),
  );

  readonly stats = computed(() => {
    const requests = this.store.requests();
    const count = (status: HelpRequestStatus) => requests.filter((r) => r.status === status).length;
    return [
      { key: 'new', label: 'New', count: count('REQUEST_RECEIVED'), icon: 'notifications_active', tone: 'bg-blue-100 text-blue-600' },
      { key: 'on-the-way', label: 'On the way', count: count('ON_THE_WAY'), icon: 'directions_walk', tone: 'bg-green-100 text-green-600' },
      { key: 'too-busy', label: 'Too busy', count: count('TOO_BUSY'), icon: 'hourglass_top', tone: 'bg-amber-100 text-amber-600' },
    ];
  });

  ngOnInit(): void {
    interval(CLOCK_TICK_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.now.set(Date.now()));
  }

  statusLabel(status: HelpRequestStatus): string {
    return HELP_STATUS_LABELS[status];
  }

  statusClass(status: HelpRequestStatus): string {
    return STATUS_CLASSES[status];
  }

  outcome(request: HelpRequest): string {
    return outcomeLabel(request);
  }

  waitingFor(request: HelpRequest): string {
    return formatDuration(this.now() - Date.parse(request.createdAt));
  }

  responseTime(request: HelpRequest): string {
    if (!request.firstResponseAt) return 'No staff response';
    return formatDuration(Date.parse(request.firstResponseAt) - Date.parse(request.createdAt));
  }

  isSaving(id: number): boolean {
    return this.saving().has(id);
  }

  respond(request: HelpRequest, status: StaffResponse): void {
    this.save(request.id, this.store.setStatus(request.id, status), `Marked ${HELP_STATUS_LABELS[status]}`);
  }

  markDone(request: HelpRequest): void {
    this.save(request.id, this.store.markDone(request.id), 'Marked done helping', () => {
      if (this.showHistory()) this.loadHistory();
    });
  }

  /** Turning the sound on also plays the chime, so staff hear what to listen for (and audio unlocks). */
  setSound(on: boolean): void {
    this.chime.setMuted(!on);
    if (on) {
      this.chime.unlock();
      this.chime.play();
    }
  }

  toggleHistory(): void {
    this.showHistory.update((shown) => !shown);
    if (this.showHistory()) this.loadHistory();
  }

  private loadHistory(): void {
    this.historyLoading.set(true);
    this.service
      .getHistory(HISTORY_LIMIT)
      .pipe(
        finalize(() => this.historyLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (closed) => this.history.set(closed),
        error: () => this.snackBar.open('Failed to load recently closed requests', 'Dismiss', { duration: 3000 }),
      });
  }

  private save(id: number, action: Observable<HelpRequest>, success: string, then?: () => void): void {
    this.setSaving(id, true);
    action
      .pipe(
        finalize(() => this.setSaving(id, false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.snackBar.open(success, undefined, { duration: 2500 });
          then?.();
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 409 || err.status === 404) {
            // The member closed it, it expired, or another staff member got there first
            this.snackBar.open('This request was already closed or changed', 'Dismiss', { duration: 3000 });
            this.store.refresh();
          } else {
            this.snackBar.open('Failed to update the request', 'Dismiss', { duration: 3000 });
          }
        },
      });
  }

  private setSaving(id: number, saving: boolean): void {
    this.saving.update((ids) => {
      const next = new Set(ids);
      if (saving) next.add(id);
      else next.delete(id);
      return next;
    });
  }
}
