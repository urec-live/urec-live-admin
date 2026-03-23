import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Exercise,
  CreateExerciseRequest,
  UpdateExerciseRequest,
} from '../models/exercise.model';
import { PagedResponse } from '../models/analytics.model';

@Injectable({ providedIn: 'root' })
export class ExerciseService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin/exercises`;

  getAll(): Observable<Exercise[]> {
    return this.http
      .get<Exercise[] | PagedResponse<Exercise>>(this.base)
      .pipe(map((res) => (Array.isArray(res) ? res : res.content)));
  }

  create(req: CreateExerciseRequest): Observable<Exercise> {
    return this.http.post<Exercise>(this.base, req);
  }

  update(id: number, req: UpdateExerciseRequest): Observable<Exercise> {
    return this.http.put<Exercise>(`${this.base}/${id}`, req);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  linkEquipment(exerciseId: number, equipmentIds: number[]): Observable<Exercise> {
    return this.http.post<Exercise>(`${this.base}/${exerciseId}/equipment`, { equipmentIds });
  }

  unlinkEquipment(exerciseId: number, equipmentId: number): Observable<Exercise> {
    return this.http.delete<Exercise>(`${this.base}/${exerciseId}/equipment/${equipmentId}`);
  }
}
