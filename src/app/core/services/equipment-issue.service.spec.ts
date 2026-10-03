import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { EquipmentIssueSummary } from '../models/equipment-issue.model';
import { EquipmentIssueService } from './equipment-issue.service';

describe('EquipmentIssueService', () => {
  const base = `${environment.apiUrl}/admin/equipment-issues`;
  let service: EquipmentIssueService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EquipmentIssueService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests only open issues by default', () => {
    service.getGrouped().subscribe();

    const req = http.expectOne((r) => r.url === base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('includeResolved')).toBe('false');
    req.flush([]);
  });

  it('can include resolved issues', () => {
    service.getGrouped(true).subscribe();

    const req = http.expectOne((r) => r.url === base);
    expect(req.request.params.get('includeResolved')).toBe('true');
    req.flush([]);
  });

  it('publishes the summary to the shared signal', () => {
    const summary: EquipmentIssueSummary = { reported: 2, acknowledged: 1, inProgress: 0, affectedMachines: 2 };
    expect(service.summary()).toBeNull();

    let emitted: EquipmentIssueSummary | undefined;
    service.loadSummary().subscribe((s) => (emitted = s));
    http.expectOne(`${base}/summary`).flush(summary);

    expect(emitted).toEqual(summary);
    expect(service.summary()).toEqual(summary);
  });

  it('leaves the shared summary alone when the request fails', () => {
    service.loadSummary().subscribe({ error: () => {} });
    http.expectOne(`${base}/summary`).flush('down', { status: 500, statusText: 'Server Error' });

    expect(service.summary()).toBeNull();
  });

  it('sets one report status', () => {
    service.updateStatus(7, 'ACKNOWLEDGED').subscribe();

    const req = http.expectOne(`${base}/7/status`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'ACKNOWLEDGED' });
    req.flush({});
  });

  it('sets the status of every open report on a machine', () => {
    service.updateMachineStatus(3, 'IN_PROGRESS').subscribe();

    const req = http.expectOne(`${base}/equipment/3/status`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'IN_PROGRESS' });
    req.flush({});
  });
});
