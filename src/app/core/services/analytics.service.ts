import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LiveSnapshot,
  UsageStats,
  PeakHours,
  UserAnalytics,
  ActivityLogEntry,
  PagedResponse,
} from '../models/analytics.model';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin`;

  getLiveSnapshot(): Observable<LiveSnapshot> {
    return this.http.get<LiveSnapshot>(`${this.base}/analytics/live`);
  }

  getUsageStats(period: 'week' | 'month'): Observable<UsageStats> {
    return this.http.get<UsageStats>(`${this.base}/analytics/usage`, { params: { period } });
  }

  getPeakHours(period: 'week' | 'month'): Observable<PeakHours> {
    return this.http.get<PeakHours>(`${this.base}/analytics/peak-hours`, { params: { period } });
  }

  getUserAnalytics(period: 'week' | 'month'): Observable<UserAnalytics> {
    return this.http.get<UserAnalytics>(`${this.base}/analytics/users`, { params: { period } });
  }

  getActivityLog(page = 0, size = 10): Observable<ActivityLogEntry[]> {
    return this.http
      .get<PagedResponse<ActivityLogEntry>>(`${this.base}/activity-log`, { params: { page, size } })
      .pipe(map((res) => res.content));
  }
}
