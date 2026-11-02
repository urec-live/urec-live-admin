import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { BackendStatus, BackendStatusService, unreachableKind } from './backend-status.service';

const networkError = () => new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });
const answered = (status: number) => new HttpErrorResponse({ status });

describe('unreachableKind', () => {
  it('counts no answer at all, and a check that timed out, as a network problem', () => {
    expect(unreachableKind(networkError())).toBe('network');
    expect(unreachableKind(new TimeoutError())).toBe('network');
  });

  [502, 503, 504].forEach((status) => {
    it(`counts a ${status} from the host as the server being down`, () => {
      expect(unreachableKind(answered(status))).toBe('server');
    });
  });

  [400, 401, 403, 404, 409, 500].forEach((status) => {
    it(`counts a ${status} as an answer`, () => {
      expect(unreachableKind(answered(status))).toBeNull();
    });
  });

  it('ignores errors that are not from a request', () => {
    expect(unreachableKind(new Error('boom'))).toBeNull();
    expect(unreachableKind(undefined)).toBeNull();
  });
});

describe('BackendStatusService', () => {
  let service: BackendStatusService;
  let seen: BackendStatus[];

  beforeEach(() => {
    service = TestBed.inject(BackendStatusService);
    seen = [];
    service.status$.subscribe((status) => seen.push(status));
  });

  it('records an outage, with its kind and time, and clears it once a request is answered', () => {
    spyOn(Date, 'now').and.returnValue(1_000);
    service.noteRequestError(networkError());
    expect(service.status).toEqual({ unreachable: 'network', failedAt: 1_000 });

    service.noteRequestError(answered(503));
    expect(service.status.unreachable).toBe('server');

    service.noteRequestAnswered();
    expect(service.status.unreachable).toBeNull();
  });

  it('counts an error answer from the server as reachable', () => {
    service.noteRequestError(networkError());
    service.noteRequestError(answered(404));

    expect(service.status.unreachable).toBeNull();
  });

  it('tells subscribers about changes, but not about answers while all is well', () => {
    service.noteRequestAnswered();
    expect(seen.length).toBe(1); // the current status on subscribe

    service.noteRequestError(networkError());
    service.noteRequestAnswered();
    expect(seen.map((s) => s.unreachable)).toEqual([null, 'network', null]);
  });

  it('ignores a request that fails after a newer one was answered', () => {
    const slow = service.noteRequestStarted();
    service.noteRequestStarted();
    service.noteRequestAnswered(); // the newer request

    service.noteRequestError(networkError(), slow);

    expect(service.status.unreachable).toBeNull();
  });

  it("judges that by request order, so a clock set back doesn't hide failures", () => {
    const now = spyOn(Date, 'now').and.returnValue(10_000_000);
    service.noteRequestStarted();
    service.noteRequestAnswered();

    now.and.returnValue(10_000_000 - 3_600_000); // an hour back
    const later = service.noteRequestStarted();
    service.noteRequestError(networkError(), later);

    expect(service.status.unreachable).toBe('network');
  });
});
