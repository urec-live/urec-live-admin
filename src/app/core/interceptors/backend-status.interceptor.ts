import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { defer, tap } from 'rxjs';
import { BackendStatusService } from '../services/backend-status.service';

/**
 * Tells BackendStatusService about every answer and failure. Registered after jwtInterceptor, so each
 * attempt is reported on its own: the original request, the token refresh and the retry.
 */
export const backendStatusInterceptor: HttpInterceptorFn = (req, next) => {
  const backendStatus = inject(BackendStatusService);
  return defer(() => {
    const requestNumber = backendStatus.noteRequestStarted();
    return next(req).pipe(
      tap({
        next: (event) => {
          if (event instanceof HttpResponse) backendStatus.noteRequestAnswered();
        },
        error: (error) => backendStatus.noteRequestError(error, requestNumber),
      }),
    );
  });
};
