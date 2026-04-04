import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, CreateUserRequest, UpdateUserRolesRequest } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin/users`;

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(this.base);
  }

  create(req: CreateUserRequest): Observable<User> {
    return this.http.post<User>(this.base, req);
  }

  updateRoles(id: number, req: UpdateUserRolesRequest): Observable<User> {
    return this.http.put<User>(`${this.base}/${id}/roles`, req);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}