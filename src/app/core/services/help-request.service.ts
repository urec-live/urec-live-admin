import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HelpRequest, StaffResponse } from '../models/help-request.model';

@Injectable({ providedIn: 'root' })
export class HelpRequestService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin/help-requests`;

  /** Open requests, longest-waiting first. */
  getOpen(): Observable<HelpRequest[]> {
    return this.http.get<HelpRequest[]>(this.base);
  }

  /** Recently closed requests, newest first. */
  getHistory(limit = 50): Observable<HelpRequest[]> {
    return this.http.get<HelpRequest[]>(`${this.base}/history`, {
      params: new HttpParams().set('limit', limit),
    });
  }

  setStatus(id: number, status: StaffResponse): Observable<HelpRequest> {
    return this.http.put<HelpRequest>(`${this.base}/${id}/status`, { status });
  }

  /** "Done helping" */
  markDone(id: number): Observable<HelpRequest> {
    return this.http.post<HelpRequest>(`${this.base}/${id}/done`, {});
  }
}
