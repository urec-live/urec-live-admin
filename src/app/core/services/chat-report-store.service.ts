import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, interval, of } from 'rxjs';
import { catchError, startWith, switchMap } from 'rxjs/operators';
import { ChatReportService } from './chat-report.service';

/** How often the reported-messages summary is re-fetched (polling, like the other stores). */
export const CHAT_REPORT_POLL_MS = 30_000;

/**
 * Keeps the Chat Reports counts current for the whole signed-in session (the shell starts it),
 * so the sidebar badge stays right and admins get a toast when a member reports a message.
 */
@Injectable({ providedIn: 'root' })
export class ChatReportStore {
  private service = inject(ChatReportService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  /** Messages waiting for review, for the sidebar badge. */
  readonly openMessages = computed(() => this.service.summary()?.openMessages ?? 0);

  private poll?: Subscription;
  /** Open reports at the last poll; null until the silent first load. */
  private lastOpenReports: number | null = null;

  start(): void {
    if (this.poll) return;
    this.poll = interval(CHAT_REPORT_POLL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.service.loadSummary().pipe(catchError(() => of(null)))),
      )
      .subscribe((summary) => {
        // A failed poll is skipped; the next one tries again
        if (!summary) return;
        const added = this.lastOpenReports === null ? 0 : summary.openReports - this.lastOpenReports;
        this.lastOpenReports = summary.openReports;
        if (added > 0) this.announce(added);
      });
  }

  stop(): void {
    this.poll?.unsubscribe();
    this.poll = undefined;
    this.lastOpenReports = null;
    // The service outlives the session, so the next admin to sign in mustn't see these counts
    this.service.summary.set(null);
  }

  private announce(added: number): void {
    this.snackBar
      .open(added === 1 ? 'A member reported a chat message' : `${added} new chat message reports`, 'View', {
        duration: 8000,
      })
      .onAction()
      .subscribe(() => this.router.navigate(['/chat-reports']));
  }
}
