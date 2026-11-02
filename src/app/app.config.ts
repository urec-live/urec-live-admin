import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { backendStatusInterceptor } from './core/interceptors/backend-status.interceptor';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    // backendStatusInterceptor last, so it sees each attempt (request, token refresh, retry) on its own
    provideHttpClient(withInterceptors([jwtInterceptor, backendStatusInterceptor]))
  ]
};
