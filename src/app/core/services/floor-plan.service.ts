import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FloorPlan,
  FloorPlanEquipment,
  CreateFloorPlanRequest,
  EquipmentPosition,
} from '../models/floor-plan.model';

@Injectable({ providedIn: 'root' })
export class FloorPlanService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin/floor-plans`;

  getAll(): Observable<FloorPlan[]> {
    return this.http.get<FloorPlan[]>(this.base);
  }

  getUnassignedEquipment(): Observable<FloorPlanEquipment[]> {
    return this.http.get<FloorPlanEquipment[]>(`${this.base}/unassigned-equipment`);
  }

  create(req: CreateFloorPlanRequest): Observable<FloorPlan> {
    return this.http.post<FloorPlan>(this.base, req);
  }

  update(id: number, body: Partial<CreateFloorPlanRequest>): Observable<FloorPlan> {
    return this.http.put<FloorPlan>(`${this.base}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  updateEquipmentPositions(floorId: number, positions: EquipmentPosition[]): Observable<FloorPlan> {
    return this.http.put<FloorPlan>(`${this.base}/${floorId}/equipment`, positions);
  }

  removeEquipmentFromFloor(floorId: number, equipmentId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${floorId}/equipment/${equipmentId}`);
  }
}
