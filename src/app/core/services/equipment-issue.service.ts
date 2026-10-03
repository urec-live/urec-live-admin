import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EquipmentIssueGroup,
  EquipmentIssueReport,
  EquipmentIssueSummary,
  IssueStatus,
} from '../models/equipment-issue.model';

@Injectable({ providedIn: 'root' })
export class EquipmentIssueService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin/equipment-issues`;

  /** Latest counts, shared by the sidebar badge and the Equipment Issues page. */
  readonly summary = signal<EquipmentIssueSummary | null>(null);

  getGrouped(includeResolved = false): Observable<EquipmentIssueGroup[]> {
    const params = new HttpParams().set('includeResolved', includeResolved);
    return this.http.get<EquipmentIssueGroup[]>(this.base, { params });
  }

  /** Fetches the counts and publishes them to {@link summary}. */
  loadSummary(): Observable<EquipmentIssueSummary> {
    return this.http
      .get<EquipmentIssueSummary>(`${this.base}/summary`)
      .pipe(tap((summary) => this.summary.set(summary)));
  }

  updateStatus(reportId: number, status: IssueStatus): Observable<EquipmentIssueReport> {
    return this.http.put<EquipmentIssueReport>(`${this.base}/${reportId}/status`, { status });
  }

  /** Applies the status to every open report on the machine. */
  updateMachineStatus(equipmentId: number, status: IssueStatus): Observable<EquipmentIssueGroup> {
    return this.http.put<EquipmentIssueGroup>(`${this.base}/equipment/${equipmentId}/status`, { status });
  }
}
