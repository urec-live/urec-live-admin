import { Injectable, computed, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EMPTY, Observable, Subscription, interval } from 'rxjs';
import { catchError, startWith, switchMap, tap } from 'rxjs/operators';
import { HelpRequest, StaffResponse, needsStaff } from '../models/help-request.model';
import { HelpRequestService } from './help-request.service';
import { ChimeService } from './chime.service';

/** How often the open queue is re-fetched (the dashboard can't use the WebSocket, see CLAUDE.md). */
export const HELP_POLL_MS = 5_000;

/**
 * The live help request queue, shared by the Help Requests page and the sidebar badge. Started by
 * the shell for the whole signed-in session, so staff are alerted (toast + chime + tab title) on
 * any page when a member calls for help.
 */
@Injectable({ providedIn: 'root' })
export class HelpRequestStore {
  private service = inject(HelpRequestService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private title = inject(Title);
  private chime = inject(ChimeService);

  readonly requests = signal<HelpRequest[]>([]);
  readonly loaded = signal(false);
  /** Members still waiting for someone to head over (new + "Too busy"). */
  readonly needsStaffCount = computed(() => this.requests().filter(needsStaff).length);

  private poll?: Subscription;
  private knownIds = new Set<number>();
  private baseTitle = '';
  private stopUnlock?: () => void;

  start(): void {
    if (this.poll) return;
    this.baseTitle = this.title.getTitle();
    this.stopUnlock = this.chime.armUnlock();
    this.poll = interval(HELP_POLL_MS)
      .pipe(
        startWith(0),
        // A failed poll shouldn't stop the next one
        switchMap(() => this.service.getOpen().pipe(catchError(() => EMPTY))),
      )
      .subscribe((list) => this.apply(list));
  }

  stop(): void {
    this.poll?.unsubscribe();
    this.poll = undefined;
    this.stopUnlock?.();
    this.stopUnlock = undefined;
    this.requests.set([]);
    this.loaded.set(false);
    this.knownIds.clear();
    if (this.baseTitle) this.title.setTitle(this.baseTitle);
  }

  /** Re-fetch now, e.g. after a 409 says the list is stale. */
  refresh(): void {
    this.service
      .getOpen()
      .pipe(catchError(() => EMPTY))
      .subscribe((list) => this.apply(list));
  }

  setStatus(id: number, status: StaffResponse): Observable<HelpRequest> {
    return this.service.setStatus(id, status).pipe(tap((updated) => this.replace(updated)));
  }

  markDone(id: number): Observable<HelpRequest> {
    return this.service.markDone(id).pipe(tap(() => this.remove(id)));
  }

  private apply(list: HelpRequest[]): void {
    // The first load after sign-in is a silent baseline; only later arrivals ring the chime
    const arrivals = this.loaded() ? list.filter((r) => !this.knownIds.has(r.id)) : [];
    this.knownIds = new Set(list.map((r) => r.id));
    this.requests.set(list);
    this.loaded.set(true);
    this.updateTitle();
    if (arrivals.length > 0) this.announce(arrivals);
  }

  private replace(updated: HelpRequest): void {
    this.requests.update((list) => list.map((r) => (r.id === updated.id ? updated : r)));
    this.updateTitle();
  }

  private remove(id: number): void {
    this.requests.update((list) => list.filter((r) => r.id !== id));
    this.updateTitle();
  }

  private announce(arrivals: HelpRequest[]): void {
    const first = arrivals[0];
    const message =
      arrivals.length === 1
        ? `New help request · ${first.equipmentName}${first.equipmentCode ? ` (${first.equipmentCode})` : ''}`
        : `${arrivals.length} new help requests`;
    this.snackBar
      .open(message, 'View', { duration: 8000 })
      .onAction()
      .subscribe(() => this.router.navigate(['/help-requests']));
    this.chime.play();
  }

  private updateTitle(): void {
    if (!this.baseTitle) return;
    const waiting = this.needsStaffCount();
    this.title.setTitle(waiting > 0 ? `(${waiting}) ${this.baseTitle}` : this.baseTitle);
  }
}
