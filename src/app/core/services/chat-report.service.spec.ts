import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { ChatReportService } from './chat-report.service';

describe('ChatReportService', () => {
  const base = `${environment.apiUrl}/admin/chat-reports`;
  let service: ChatReportService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ChatReportService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests only open reports by default, or resolved ones too', () => {
    service.getGrouped().subscribe();
    const open = http.expectOne((r) => r.url === base);
    expect(open.request.method).toBe('GET');
    expect(open.request.params.get('includeResolved')).toBe('false');
    open.flush([]);

    service.getGrouped(true).subscribe();
    const all = http.expectOne((r) => r.url === base);
    expect(all.request.params.get('includeResolved')).toBe('true');
    all.flush([]);
  });

  it('publishes the summary to the shared signal', () => {
    expect(service.summary()).toBeNull();
    service.loadSummary().subscribe();
    http.expectOne(`${base}/summary`).flush({ openMessages: 2, openReports: 3 });
    expect(service.summary()).toEqual({ openMessages: 2, openReports: 3 });
  });

  it('dismisses and removes on the channel URL', () => {
    service.dismiss('COMMUNITY', 5).subscribe();
    const dismiss = http.expectOne(`${base}/community/5/dismiss`);
    expect(dismiss.request.method).toBe('PUT');
    dismiss.flush({});

    service.remove('DM', 9).subscribe();
    const remove = http.expectOne(`${base}/dm/9/remove`);
    expect(remove.request.method).toBe('PUT');
    remove.flush({});
  });
});
