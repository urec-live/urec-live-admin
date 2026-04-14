import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActivityLogEntry, ActivitySummary, PagedResponse } from '../models/activity.model';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin`;

  getLogs(
    page: number,
    size: number,
    eventType?: string,
    search?: string,
    from?: string,
    to?: string
  ): Observable<PagedResponse<ActivityLogEntry>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (eventType) params = params.set('eventType', eventType);
    if (search)    params = params.set('search', search);
    if (from)      params = params.set('from', from);
    if (to)        params = params.set('to', to);

    return this.http.get<PagedResponse<ActivityLogEntry>>(
      `${this.base}/activity-log`, { params }
    );
  }

  getSummary(): Observable<ActivitySummary> {
    return this.http.get<ActivitySummary>(`${this.base}/activity-log/summary`);
  }
}