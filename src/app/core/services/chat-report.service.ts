import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ChatChannel,
  ChatReportGroup,
  ChatReportSummary,
  chatChannelPath,
} from '../models/chat-report.model';

@Injectable({ providedIn: 'root' })
export class ChatReportService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin/chat-reports`;

  /** Latest counts, shared by the sidebar badge and the Chat Reports page. */
  readonly summary = signal<ChatReportSummary | null>(null);

  getGrouped(includeResolved = false): Observable<ChatReportGroup[]> {
    const params = new HttpParams().set('includeResolved', includeResolved);
    return this.http.get<ChatReportGroup[]>(this.base, { params });
  }

  /** Fetches the counts and publishes them to {@link summary}. */
  loadSummary(): Observable<ChatReportSummary> {
    return this.http
      .get<ChatReportSummary>(`${this.base}/summary`)
      .pipe(tap((summary) => this.summary.set(summary)));
  }

  /** Closes the message's open reports and leaves the message up. */
  dismiss(channel: ChatChannel, messageId: number): Observable<ChatReportGroup> {
    return this.http.put<ChatReportGroup>(`${this.base}/${chatChannelPath(channel)}/${messageId}/dismiss`, {});
  }

  /** Hides the message from members ("Removed by staff") and closes its open reports. */
  remove(channel: ChatChannel, messageId: number): Observable<ChatReportGroup> {
    return this.http.put<ChatReportGroup>(`${this.base}/${chatChannelPath(channel)}/${messageId}/remove`, {});
  }
}
