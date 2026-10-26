import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { BackendStatusService } from '../services/backend-status.service';
import { backendStatusInterceptor } from './backend-status.interceptor';
import { jwtInterceptor } from './jwt.interceptor';

/** The interceptors as app.config.ts registers them, so the token refresh goes through both */
describe('backendStatusInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let status: BackendStatusService;
  const ignore = { error: () => undefined };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([jwtInterceptor, backendStatusInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    status = TestBed.inject(BackendStatusService);
  });

  afterEach(() => {
    backend.verify();
    localStorage.clear();
  });

  it('reports a request that gets no answer', () => {
    http.get('/api/machines').subscribe(ignore);
    backend.expectOne('/api/machines').error(new ProgressEvent('error'));

    expect(status.status.unreachable).toBe('network');
  });

  it("reports the host saying the backend is down", () => {
    http.get('/api/machines').subscribe(ignore);
    backend.expectOne('/api/machines').flush('Application failed to respond', { status: 502, statusText: 'Bad Gateway' });

    expect(status.status.unreachable).toBe('server');
  });

  it('clears the outage on the next answer, including an error answer', () => {
    http.get('/api/machines').subscribe(ignore);
    backend.expectOne('/api/machines').error(new ProgressEvent('error'));
    http.get('/api/users/9').subscribe(ignore);
    backend.expectOne('/api/users/9').flush('Not found', { status: 404, statusText: 'Not Found' });

    expect(status.status.unreachable).toBeNull();
  });

  it('ignores a slow request failing after a newer one was answered', () => {
    http.get('/api/slow').subscribe(ignore);
    http.get('/api/fast').subscribe();
    backend.expectOne('/api/fast').flush([]);

    backend.expectOne('/api/slow').error(new ProgressEvent('error'));

    expect(status.status.unreachable).toBeNull();
  });

  describe('token refresh', () => {
    let navigate: jasmine.Spy;

    beforeEach(() => {
      localStorage.setItem('urec_access_token', 'old');
      localStorage.setItem('urec_refresh_token', 'refresh');
      navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
      http.get('/api/admin/users').subscribe(ignore);
      backend.expectOne('/api/admin/users').flush('', { status: 401, statusText: 'Unauthorized' });
    });

    it('keeps the admin signed in, and reports the outage, when the refresh can\'t reach the server', () => {
      backend.expectOne(`${environment.apiUrl}/auth/refresh`).error(new ProgressEvent('error'));

      expect(status.status.unreachable).toBe('network');
      expect(localStorage.getItem('urec_refresh_token')).toBe('refresh');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('still signs the admin out when the server refuses the refresh', () => {
      backend.expectOne(`${environment.apiUrl}/auth/refresh`).flush('', { status: 401, statusText: 'Unauthorized' });

      expect(localStorage.getItem('urec_refresh_token')).toBeNull();
      expect(navigate).toHaveBeenCalledWith(['/login']);
      expect(status.status.unreachable).toBeNull();
    });
  });
});
