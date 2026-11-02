import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { Subscription, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  BackendStatus,
  BackendStatusService,
  CHECK_TIMEOUT_MS,
  NOTICE_QUIET_MS,
  NOTICE_VISIBLE_MS,
  RECONNECTED_VISIBLE_MS,
  UNREACHABLE_COPY,
  UnreachableKind,
} from '../../../core/services/backend-status.service';

type Phase =
  | { kind: 'hidden' }
  | { kind: 'down'; reason: UnreachableKind; stillDown: boolean }
  | { kind: 'reconnected' };

const HIDDEN: Phase = { kind: 'hidden' };

/**
 * Whether a failure falls in the quiet time after the warning went away. A failure stamped before
 * that (the computer's clock was set back) ends the quiet time rather than stretching it.
 */
export function isQuiet(failedAt: number, quietSince: number | null): boolean {
  return quietSince !== null && failedAt >= quietSince && failedAt - quietSince < NOTICE_QUIET_MS;
}

/**
 * A card at the top of every page (the login page too, and above dialogs) when requests can't reach
 * the backend, with what to try next. It goes away on its own after a few seconds, and if requests
 * start getting answers while it's up, it says "Connected again" before going. Once it has been up,
 * more failures don't bring it back for a while, so a patchy connection doesn't make it flicker.
 */
@Component({
  selector: 'app-backend-unreachable-notice',
  standalone: true,
  imports: [MatIconModule],
  template: `
    @switch (phase().kind) {
      @case ('down') {
        <div
          role="alert"
          aria-live="polite"
          data-testid="backend-notice"
          class="fixed top-3 left-1/2 -translate-x-1/2 z-[1100] w-[min(34rem,calc(100vw-2rem))] flex items-start gap-3 rounded-lg bg-slate-700 text-white shadow-lg px-4 py-3"
        >
          <mat-icon class="shrink-0 text-amber-300">{{ reason() === 'network' ? 'wifi_off' : 'cloud_off' }}</mat-icon>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold">{{ title() }}</p>
            <p class="mt-1 text-[13px] leading-5 text-slate-100">{{ steps() }}</p>
            <button
              type="button"
              data-testid="backend-notice-retry"
              class="mt-2 rounded-full bg-amber-300 px-3 py-1 text-[13px] font-semibold text-slate-800 disabled:opacity-60"
              [disabled]="checking()"
              (click)="tryAgain()"
            >
              {{ checking() ? 'Checking…' : 'Try again' }}
            </button>
          </div>
          <button type="button" aria-label="Dismiss" class="shrink-0 text-white/80 hover:text-white" (click)="dismiss()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      }
      @case ('reconnected') {
        <div
          role="alert"
          aria-live="polite"
          data-testid="backend-notice"
          class="fixed top-3 left-1/2 -translate-x-1/2 z-[1100] flex items-center gap-2 rounded-lg bg-green-700 text-white shadow-lg px-4 py-3"
        >
          <mat-icon>check_circle</mat-icon>
          <p class="text-sm font-semibold">Connected again</p>
        </div>
      }
    }
  `,
})
export class BackendUnreachableNoticeComponent {
  private readonly backendStatus = inject(BackendStatusService);
  private readonly http = inject(HttpClient);

  readonly phase = signal<Phase>(HIDDEN);
  readonly checking = signal(false);
  readonly reason = computed(() => {
    const phase = this.phase();
    return phase.kind === 'down' ? phase.reason : null;
  });
  readonly title = computed(() => {
    const phase = this.phase();
    if (phase.kind !== 'down') return '';
    const copy = UNREACHABLE_COPY[phase.reason];
    return phase.stillDown ? copy.stillTitle : copy.title;
  });
  readonly steps = computed(() => {
    const reason = this.reason();
    return reason ? UNREACHABLE_COPY[reason].steps : '';
  });

  // When the warning last went away, however it went: failures in the next 30 s stay quiet
  private quietSince: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  // The running Try again request; closing the warning cancels it, so its result can't bring it back
  private check: Subscription | null = null;

  constructor() {
    this.backendStatus.status$.pipe(takeUntilDestroyed()).subscribe((status) => this.onStatus(status));
    inject(DestroyRef).onDestroy(() => {
      this.clearTimer();
      this.check?.unsubscribe();
    });
  }

  dismiss(): void {
    this.leaveDown(HIDDEN);
  }

  tryAgain(): void {
    if (this.checking()) return;
    this.checking.set(true);
    // The warning stays up until the check is done, however long it takes
    this.clearTimer();
    this.check = this.http
      .get(`${environment.apiUrl}/auth/test`, { responseType: 'text' })
      .pipe(timeout(CHECK_TIMEOUT_MS))
      .subscribe({
        next: () => {
          this.check = null;
          this.checking.set(false);
          this.backendStatus.noteRequestAnswered();
        },
        error: (error) => {
          this.check = null;
          this.checking.set(false);
          this.backendStatus.noteRequestError(error);
          const reason = this.backendStatus.status.unreachable;
          if (reason && this.phase().kind === 'down') this.showDown(reason, true);
        },
      });
  }

  private onStatus(status: BackendStatus): void {
    const reason = status.unreachable;
    const phase = this.phase();
    if (!reason) {
      if (phase.kind === 'down') this.leaveDown({ kind: 'reconnected' });
      return;
    }
    if (phase.kind === 'down') {
      // New wording, same time on screen
      if (phase.reason !== reason) this.phase.set({ ...phase, reason });
    } else if (phase.kind === 'reconnected') {
      // Requests are failing again, so it isn't connected after all; stay quiet for now
      this.hide();
    } else if (!isQuiet(status.failedAt, this.quietSince)) {
      this.showDown(reason, false);
    }
  }

  private showDown(reason: UnreachableKind, stillDown: boolean): void {
    this.phase.set({ kind: 'down', reason, stillDown });
    if (!this.checking()) this.arm(NOTICE_VISIBLE_MS);
  }

  private leaveDown(next: Phase): void {
    this.check?.unsubscribe();
    this.check = null;
    this.checking.set(false);
    this.quietSince = Date.now();
    this.phase.set(next);
    if (next.kind === 'reconnected') this.arm(RECONNECTED_VISIBLE_MS);
    else this.clearTimer();
  }

  private hide(): void {
    this.clearTimer();
    this.phase.set(HIDDEN);
  }

  private arm(ms: number): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.phase().kind === 'down') this.leaveDown(HIDDEN);
      else this.hide();
    }, ms);
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
