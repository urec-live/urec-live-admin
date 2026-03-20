import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Equipment,
  CreateEquipmentRequest,
  UpdateEquipmentRequest,
} from '../models/equipment.model';
import { PagedResponse } from '../models/analytics.model';

@Injectable({ providedIn: 'root' })
export class EquipmentService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin/equipment`;

  getAll(): Observable<Equipment[]> {
    return this.http
      .get<Equipment[] | PagedResponse<Equipment>>(this.base)
      .pipe(map((res) => (Array.isArray(res) ? res : res.content)));
  }

  create(req: CreateEquipmentRequest): Observable<Equipment> {
    return this.http.post<Equipment>(this.base, req);
  }

  update(id: number, req: UpdateEquipmentRequest): Observable<Equipment> {
    return this.http.put<Equipment>(`${this.base}/${id}`, req);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
