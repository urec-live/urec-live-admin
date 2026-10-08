import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { HelpRequest } from '../models/help-request.model';
import { HelpRequestService } from './help-request.service';

describe('HelpRequestService', () => {
  const base = `${environment.apiUrl}/admin/help-requests`;
  let service: HelpRequestService;
  let http: HttpTestingController;

  const request = { id: 7, status: 'ON_THE_WAY' } as HelpRequest;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HelpRequestService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the open queue', () => {
    let result: HelpRequest[] | undefined;
    service.getOpen().subscribe((list) => (result = list));

    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([request]);
    expect(result).toEqual([request]);
  });

  it('loads recently closed requests, 50 by default', () => {
    service.getHistory().subscribe();

    const req = http.expectOne((r) => r.url === `${base}/history`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('limit')).toBe('50');
    req.flush([]);
  });

  it('passes a custom history limit', () => {
    service.getHistory(5).subscribe();

    const req = http.expectOne((r) => r.url === `${base}/history`);
    expect(req.request.params.get('limit')).toBe('5');
    req.flush([]);
  });

  it('sets a staff response with PUT /{id}/status', () => {
    let result: HelpRequest | undefined;
    service.setStatus(7, 'TOO_BUSY').subscribe((updated) => (result = updated));

    const req = http.expectOne(`${base}/7/status`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'TOO_BUSY' });
    req.flush(request);
    expect(result).toEqual(request);
  });

  it('closes a request with POST /{id}/done', () => {
    service.markDone(7).subscribe();

    const req = http.expectOne(`${base}/7/done`);
    expect(req.request.method).toBe('POST');
    req.flush({ ...request, status: 'RESOLVED' });
  });
});
