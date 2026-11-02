import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, TimeoutError } from 'rxjs';

/**
 * "network": no answer at all, e.g. no internet, the server is down, a CORS failure, or Try again's
 * 10 s timeout. "server": the host answered that the backend behind it isn't (502/503/504 from
 * Railway's proxy). In the browser, Railway's own error page has no CORS headers, so an outage
 * often arrives as "network" too.
 */
export type UnreachableKind = 'network' | 'server';

export interface BackendStatus {
  /** Why requests are failing, or null while they're being answered */
  unreachable: UnreachableKind | null;
  /** When the latest failing request ended, so a new failure can be told apart from an old one */
  failedAt: number;
}

/** What to tell staff when the dashboard can't reach the backend, and what to try next. */
export const UNREACHABLE_COPY: Record<UnreachableKind, { title: string; stillTitle: string; steps: string; short: string }> = {
  network: {
    title: "Can't reach UREC Live",
    stillTitle: "Still can't reach UREC Live",
    steps:
      'Check your internet connection, then try again. If your connection is fine, the server may be down for a moment. If it keeps happening, reload the page.',
    short: "Can't reach UREC Live right now. Check your internet connection, then try again.",
  },
  server: {
    title: "UREC Live isn't responding",
    stillTitle: "UREC Live still isn't responding",
    steps:
      "Your connection works, but the server isn't answering. Try again in a minute. If it keeps happening, reload the page.",
    short: "UREC Live isn't responding right now. Try again in a minute.",
  },
};

/** How long the notice stays up on its own */
export const NOTICE_VISIBLE_MS = 10_000;
/** After it goes away (on its own, closed, or turned into Connected again), failures within this long don't bring it back */
export const NOTICE_QUIET_MS = 30_000;
/** How long "Connected again" shows once requests are answered */
export const RECONNECTED_VISIBLE_MS = 3_000;
/** Try again gives up after this long */
export const CHECK_TIMEOUT_MS = 10_000;

const GATEWAY_STATUSES = new Set([502, 503, 504]);

/** Whether a failed request means the backend can't be reached, and how. Any other answer means it can. */
export function unreachableKind(error: unknown): UnreachableKind | null {
  if (error instanceof TimeoutError) return 'network';
  if (!(error instanceof HttpErrorResponse)) return null;
  if (error.status === 0) return 'network';
  return GATEWAY_STATUSES.has(error.status) ? 'server' : null;
}

const ANSWERED: BackendStatus = { unreachable: null, failedAt: 0 };

/**
 * Whether the dashboard can reach the backend right now, judged from the requests it already makes
 * (no extra pings). backendStatusInterceptor reports every answer and failure here, and
 * BackendUnreachableNoticeComponent shows the result.
 */
@Injectable({ providedIn: 'root' })
export class BackendStatusService {
  private readonly subject = new BehaviorSubject<BackendStatus>(ANSWERED);
  readonly status$ = this.subject.asObservable();

  // Requests are numbered as they start: a counter rather than the clock, so changing the
  // computer's time can't make failures look old
  private requestsStarted = 0;
  // How many requests had started when the latest answer came in
  private startedBeforeLastAnswer = 0;

  get status(): BackendStatus {
    return this.subject.value;
  }

  /** A request is about to be sent. Returns its number, to pass back with its failure. */
  noteRequestStarted(): number {
    return ++this.requestsStarted;
  }

  /** The backend answered a request, whatever the status code. */
  noteRequestAnswered(): void {
    this.startedBeforeLastAnswer = this.requestsStarted;
    if (this.status.unreachable !== null) this.subject.next({ unreachable: null, failedAt: this.status.failedAt });
  }

  /** A request failed: records an outage if the backend couldn't be reached, otherwise counts it as answered. */
  noteRequestError(error: unknown, requestNumber?: number): void {
    const kind = unreachableKind(error);
    if (kind) {
      // A slow request that started before a newer answer (e.g. a poll that hung) says nothing about now
      if (requestNumber !== undefined && requestNumber <= this.startedBeforeLastAnswer) return;
      this.subject.next({ unreachable: kind, failedAt: Date.now() });
    } else if (error instanceof HttpErrorResponse) {
      this.noteRequestAnswered();
    }
  }
}
