import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatReportService } from '../../core/services/chat-report.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  CHAT_CHANNEL_LABELS,
  CHAT_REPORT_REASON_LABELS,
  ChatReportGroup,
} from '../../core/models/chat-report.model';

@Component({
  selector: 'app-chat-reports',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  template: `
    <div class="p-6 max-w-screen-xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-semibold text-gray-800">Chat Reports</h1>
          <p class="text-sm text-gray-500 mt-0.5">Chat messages members have reported for staff review</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <mat-slide-toggle [(ngModel)]="showResolved" (ngModelChange)="loadAll()" color="primary"
                              data-testid="show-resolved">
            </mat-slide-toggle>
            <span>Show resolved</span>
          </div>
          <button mat-icon-button matTooltip="Refresh now" (click)="loadAll()" [disabled]="loading()">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <mat-card class="!py-4 !px-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <mat-icon class="text-red-600">flag</mat-icon>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-800" data-testid="stat-messages">{{ summary()?.openMessages ?? '—' }}</p>
              <p class="text-xs text-gray-500">Messages awaiting review</p>
            </div>
          </div>
        </mat-card>
        <mat-card class="!py-4 !px-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <mat-icon class="text-amber-600">forum</mat-icon>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-800" data-testid="stat-reports">{{ summary()?.openReports ?? '—' }}</p>
              <p class="text-xs text-gray-500">Open reports</p>
            </div>
          </div>
        </mat-card>
      </div>

      @if (loading() && groups().length === 0) {
        <div class="flex justify-center py-16"><mat-spinner diameter="40" /></div>
      } @else if (groups().length === 0) {
        <mat-card class="!py-4 !px-5 text-center" data-testid="empty">
          <div class="py-10">
            <mat-icon class="!w-12 !h-12 !text-5xl text-green-500">verified_user</mat-icon>
            <p class="text-gray-700 font-medium mt-2">No reported messages</p>
            <p class="text-sm text-gray-500">When members report a chat message, it shows up here.</p>
          </div>
        </mat-card>
      } @else {
        <div class="flex flex-col gap-4">
          @for (group of groups(); track key(group)) {
            <mat-card class="!py-4 !px-5" [attr.data-testid]="'report-' + key(group)">
              <!-- Who and where -->
              <div class="flex flex-wrap items-center gap-2 mb-3">
                <span class="px-2 py-0.5 rounded-full text-xs font-semibold"
                      [class]="group.channel === 'DM' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'">
                  {{ channelLabels[group.channel] }}
                </span>
                @if (group.messageAvailable) {
                  <span class="text-sm text-gray-700" data-testid="who">
                    From <strong>{{ group.senderUsername }}</strong>
                    @if (group.recipientUsername) { to <strong>{{ group.recipientUsername }}</strong> }
                  </span>
                  <span class="text-xs text-gray-400">{{ group.sentAt | date:'MMM d, h:mm a' }}</span>
                }
                @if (group.deletedBySender) {
                  <span class="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600" data-testid="deleted-tag">Deleted by sender</span>
                }
                @if (group.removedByStaff) {
                  <span class="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700" data-testid="removed-tag">Removed by staff</span>
                }
                <span class="px-2 py-0.5 rounded-full text-xs font-semibold"
                      [class]="group.openCount > 0 ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'"
                      data-testid="open-count">
                  {{ group.openCount > 0 ? group.openCount + (group.openCount === 1 ? ' open report' : ' open reports') : 'Resolved' }}
                </span>
              </div>

              <!-- What was said -->
              <div class="rounded-lg bg-gray-50 border border-gray-200 p-3 mb-3" data-testid="message">
                @if (!group.messageAvailable) {
                  <p class="text-sm text-gray-500">This message no longer exists.</p>
                } @else if (group.media && group.kind !== 'TEXT') {
                  <img [src]="group.media.url"
                       [alt]="(group.kind === 'STICKER' ? 'Sticker' : 'GIF') + ' from ' + group.senderUsername"
                       class="h-32 rounded" data-testid="message-media" />
                } @else {
                  <p class="text-gray-800 whitespace-pre-line break-words">{{ group.content }}</p>
                }
              </div>

              <!-- Reports -->
              <ul class="flex flex-col gap-2 mb-4">
                @for (report of group.reports; track report.id) {
                  <li class="text-sm" data-testid="report-row">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-semibold text-gray-800">{{ reasonLabels[report.reason] }}</span>
                      <span class="text-gray-500">by {{ report.reporterUsername }}</span>
                      <span class="text-xs text-gray-400">{{ report.reportedAt | date:'MMM d, h:mm a' }}</span>
                      @if (report.status !== 'OPEN') {
                        <span class="text-xs text-gray-500">
                          · {{ report.status === 'DISMISSED' ? 'Dismissed' : 'Actioned' }}
                          @if (report.resolvedBy) { by {{ report.resolvedBy }} }
                        </span>
                      }
                    </div>
                    @if (report.note) {
                      <p class="text-gray-600 mt-0.5">"{{ report.note }}"</p>
                    }
                  </li>
                }
              </ul>

              <!-- Actions -->
              @if (group.openCount > 0) {
                <div class="flex justify-end gap-2">
                  <button mat-stroked-button (click)="dismiss(group)" [disabled]="isSaving(group)" data-testid="dismiss">
                    <mat-icon>done</mat-icon> Keep message
                  </button>
                  @if (group.messageAvailable) {
                    <button mat-flat-button color="warn" (click)="remove(group)" [disabled]="isSaving(group)" data-testid="remove">
                      <mat-icon>delete</mat-icon> Remove message
                    </button>
                  }
                </div>
              }
            </mat-card>
          }
        </div>
      }
    </div>
  `,
})
export class ChatReportsComponent implements OnInit {
  private service = inject(ChatReportService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  readonly channelLabels = CHAT_CHANNEL_LABELS;
  readonly reasonLabels = CHAT_REPORT_REASON_LABELS;
  readonly summary = this.service.summary;
  readonly groups = signal<ChatReportGroup[]>([]);
  readonly loading = signal(false);
  private readonly saving = signal<ReadonlySet<string>>(new Set());

  /** Also lists messages whose reports were all dismissed or actioned. */
  showResolved = false;

  ngOnInit(): void {
    this.loadAll();
  }

  key(group: ChatReportGroup): string {
    return `${group.channel}-${group.messageId}`;
  }

  isSaving(group: ChatReportGroup): boolean {
    return this.saving().has(this.key(group));
  }

  loadAll(): void {
    this.loading.set(true);
    this.service.getGrouped(this.showResolved).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (groups) => {
        this.groups.set(groups);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load reported messages', 'Dismiss', { duration: 3000 });
      },
    });
    this.refreshSummary();
  }

  /** Closes the reports and leaves the message up. */
  dismiss(group: ChatReportGroup): void {
    this.act(group, this.service.dismiss(group.channel, group.messageId), 'Reports dismissed; the message stays up');
  }

  /** Hides the message from members after confirming. */
  remove(group: ChatReportGroup): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Remove this message?',
          message: `Members will see "Removed by staff" in place of ${group.senderUsername}'s message.`,
          confirmLabel: 'Remove',
          danger: true,
        } as ConfirmDialogData,
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      // Closing the dialog any other way (Escape, backdrop) counts as Cancel
      .subscribe((confirmed) => {
        if (confirmed) this.act(group, this.service.remove(group.channel, group.messageId), 'Message removed');
      });
  }

  private act(group: ChatReportGroup, request: Observable<ChatReportGroup>, done: string): void {
    const key = this.key(group);
    this.setSaving(key, true);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.setSaving(key, false);
        this.groups.update((groups) =>
          this.showResolved
            ? groups.map((g) => (this.key(g) === key ? updated : g))
            // Resolved messages leave the default list
            : groups.filter((g) => this.key(g) !== key || updated.openCount > 0),
        );
        this.refreshSummary();
        this.snackBar.open(done, 'OK', { duration: 3000 });
      },
      error: (err: unknown) => {
        this.setSaving(key, false);
        if (err instanceof HttpErrorResponse && (err.status === 404 || err.status === 409)) {
          // Someone else got there first; show what's true now
          this.snackBar.open('Another admin already handled this message', 'Dismiss', { duration: 4000 });
          this.loadAll();
        } else {
          this.snackBar.open('Failed to update the report', 'Dismiss', { duration: 3000 });
        }
      },
    });
  }

  private refreshSummary(): void {
    this.service.loadSummary().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => {} });
  }

  private setSaving(key: string, on: boolean): void {
    this.saving.update((set) => {
      const next = new Set(set);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }
}
