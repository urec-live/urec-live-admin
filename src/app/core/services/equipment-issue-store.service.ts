import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, Subscription, forkJoin, interval, of } from 'rxjs';
import { catchError, startWith, switchMap } from 'rxjs/operators';
import { EquipmentIssueService } from './equipment-issue.service';
import {
  EquipmentIssueGroup,
  EquipmentIssueReport,
  ISSUE_SEVERITY_LABELS,
} from '../models/equipment-issue.model';

/** How often open reports and the summary are re-fetched (polling, not WebSocket: sockjs-client crashes in the browser). */
export const ISSUE_POLL_MS = 10_000;

/**
 * Watches for new equipment issue reports for the whole signed-in session (the shell starts it), so
 * admins get a toast on any page and the badge, dashboard and issues page stay current without a
 * refresh. Modelled on HelpRequestStore, minus the chime and tab title, which stay with help calls.
 */
@Injectable({ providedIn: 'root' })
export class EquipmentIssueStore {
  private service = inject(EquipmentIssueService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  private readonly arrivals = new Subject<EquipmentIssueReport[]>();
  /** Reports filed since the store started, as they're noticed. */
  readonly arrivals$: Observable<EquipmentIssueReport[]> = this.arrivals.asObservable();

  private poll?: Subscription;
  /** Highest report id seen so far; null until the silent first load. */
  private latestSeenId: number | null = null;

  start(): void {
    if (this.poll) return;
    this.poll = interval(ISSUE_POLL_MS)
      .pipe(
        startWith(0),
        switchMap(() =>
          forkJoin({
            // The first load includes resolved reports so it knows the true highest id. Ids only
            // grow, so a report an admin reopens later is never mistaken for a new one.
            groups: this.service.getGrouped(this.latestSeenId === null).pipe(catchError(() => of(null))),
            // Keeps the shared summary signal (badge, stat cards, dashboard) current
            summary: this.service.loadSummary().pipe(catchError(() => of(null))),
          }),
        ),
      )
      .subscribe(({ groups }) => {
        // A failed poll is skipped; the next one tries again
        if (groups) this.apply(groups);
      });
  }

  stop(): void {
    this.poll?.unsubscribe();
    this.poll = undefined;
    this.latestSeenId = null;
  }

  private apply(groups: EquipmentIssueGroup[]): void {
    const reports = groups.flatMap((group) => group.reports);
    const highest = reports.reduce((max, report) => Math.max(max, report.id), this.latestSeenId ?? 0);

    // The first load after sign-in is a silent baseline; only later reports are announced
    const arrivals = this.latestSeenId === null
      ? []
      : reports.filter((report) => report.id > (this.latestSeenId ?? 0)).sort((a, b) => a.id - b.id);
    this.latestSeenId = highest;

    if (arrivals.length > 0) {
      this.announce(arrivals);
      this.arrivals.next(arrivals);
    }
  }

  private announce(arrivals: EquipmentIssueReport[]): void {
    const first = arrivals[0];
    const message =
      arrivals.length === 1
        ? `New equipment issue · ${first.equipmentName}${first.equipmentCode ? ` (${first.equipmentCode})` : ''}`
          + ` · ${ISSUE_SEVERITY_LABELS[first.severity]}`
        : `${arrivals.length} new equipment issues`;
    this.snackBar
      .open(message, 'View', { duration: 8000 })
      .onAction()
      .subscribe(() => this.router.navigate(['/equipment-issues']));
  }
}
