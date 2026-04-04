import {
  Component,
  inject,
  OnInit,
  AfterViewInit,
  ViewChild,
  signal,
  DestroyRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { User, CreateUserRequest, UpdateUserRolesRequest } from '../../core/models/user.model';
import { UserService } from '../../core/services/user.service';
import { UserFormComponent, UserFormData } from './user-form/user-form.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatCardModule,
    MatChipsModule,
    MatBadgeModule,
  ],
  template: `
    <div class="p-6 max-w-screen-xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-semibold text-gray-800">Users</h1>
          <p class="text-sm text-gray-500 mt-0.5">
            Manage gym members and admin accounts
          </p>
        </div>
        <button mat-flat-button color="primary" (click)="openAdd()">
          <mat-icon>person_add</mat-icon>
          Add User
        </button>
      </div>

      <!-- Filter bar -->
      <mat-card class="mb-4">
        <mat-card-content class="!flex flex-wrap items-center gap-3 !py-3">
          <mat-form-field appearance="outline" class="flex-1 min-w-[200px] !mb-0">
            <mat-label>Search</mat-label>
            <input
              matInput
              [(ngModel)]="searchTerm"
              (ngModelChange)="applyFilter()"
              placeholder="Username or email…"
            />
            <mat-icon matSuffix class="text-gray-400">search</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-40 !mb-0">
            <mat-label>Role</mat-label>
            <mat-select [(ngModel)]="roleFilter" (ngModelChange)="applyFilter()">
              <mat-option value="">All</mat-option>
              <mat-option value="ADMIN">Admin</mat-option>
              <mat-option value="USER">User</mat-option>
            </mat-select>
          </mat-form-field>
        </mat-card-content>
      </mat-card>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-16">
          <mat-spinner diameter="48" />
        </div>
      }

      <!-- Table -->
      @if (!loading()) {
        <mat-card class="overflow-hidden">
          <table mat-table [dataSource]="dataSource" matSort class="w-full">

            <!-- Username column -->
            <ng-container matColumnDef="username">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Username</th>
              <td mat-cell *matCellDef="let u">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold">
                    {{ u.username.charAt(0).toUpperCase() }}
                  </div>
                  <span class="font-medium text-gray-800">{{ u.username }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Email column -->
            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Email</th>
              <td mat-cell *matCellDef="let u">
                <span class="text-gray-600 text-sm">{{ u.email }}</span>
              </td>
            </ng-container>

            <!-- Roles column -->
            <ng-container matColumnDef="roles">
              <th mat-header-cell *matHeaderCellDef>Roles</th>
              <td mat-cell *matCellDef="let u">
                <div class="flex flex-wrap gap-1">
                  @for (role of u.roles; track role) {
                    <span [class]="roleClass(role)"
                          class="px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap">
                      {{ role }}
                    </span>
                  }
                </div>
              </td>
            </ng-container>

            <!-- Status column -->
            <ng-container matColumnDef="enabled">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
              <td mat-cell *matCellDef="let u">
                <span [class]="u.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'"
                  class="px-2.5 py-0.5 rounded-full text-xs font-medium">
                  {{ u.enabled ? 'Active' : 'Disabled' }}
                </span>
              </td>
            </ng-container>

            <!-- Actions column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="w-28"></th>
              <td mat-cell *matCellDef="let u">
                <div class="flex items-center">
                  <button mat-icon-button matTooltip="Edit Roles" (click)="openEdit(u)">
                    <mat-icon class="!text-[20px] text-gray-400">manage_accounts</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Delete User" (click)="openDelete(u)">
                    <mat-icon class="!text-[20px] text-red-400">delete</mat-icon>
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns" class="bg-gray-50"></tr>
            <tr mat-row *matRowDef="let row; columns: columns" class="hover:bg-gray-50 transition-colors"></tr>

            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell py-12 text-center text-gray-400" [attr.colspan]="columns.length">
                @if (searchTerm || roleFilter) {
                  No users match your filters.
                } @else {
                  No users found.
                }
              </td>
            </tr>
          </table>

          <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons />
        </mat-card>
      }
    </div>
  `,
})
export class UsersComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private userService = inject(UserService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  columns = ['username', 'email', 'roles', 'enabled', 'actions'];

  loading = signal(false);
  dataSource = new MatTableDataSource<User>([]);

  searchTerm = '';
  roleFilter = '';

  ngOnInit(): void {
    // ✅ FIX: Always parse JSON filter so predicate runs for ALL filter states.
    // MatTableDataSource skips filterPredicate entirely when filter === '',
    // so we always set a JSON string — empty search/role just returns true for all rows.
    this.dataSource.filterPredicate = (data: User, filter: string) => {
      try {
        const f = JSON.parse(filter) as { search: string; role: string };
        const matchesSearch =
          !f.search ||
          data.username.toLowerCase().includes(f.search) ||
          data.email.toLowerCase().includes(f.search);
        const matchesRole =
          !f.role || (data.roles ?? []).some(r => r === f.role || r === `ROLE_${f.role}`);
        return matchesSearch && matchesRole;
      } catch {
        return true; // if JSON parse fails, show all rows
      }
    };
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadUsers(): void {
    this.loading.set(true);
    this.userService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.dataSource.data = users;
          this.loading.set(false);
          this.applyFilter(); // ✅ reapply current filter after data loads
        },
        error: () => {
          this.snackBar.open('Failed to load users', 'Dismiss', { duration: 3000 });
          this.loading.set(false);
        },
      });
  }

  applyFilter(): void {
    // ✅ FIX: Always set a non-empty string so filterPredicate is always invoked.
    // Using a space ' ' as a sentinel ensures the predicate runs even when
    // both search and role are empty — the predicate itself handles the "show all" logic.
    const filterValue = JSON.stringify({
      search: this.searchTerm.toLowerCase().trim(),
      role: this.roleFilter,
    });
    this.dataSource.filter = filterValue || ' ';
    this.dataSource.paginator?.firstPage();
  }

  roleClass(role: string): string {
    // Strip ROLE_ prefix so both "ADMIN" and "ROLE_ADMIN" get the right colour
    const r = role.replace(/^ROLE_/, "");
    switch (r) {
      case "ADMIN": return "bg-purple-100 text-purple-700";
      case "USER":  return "bg-blue-100 text-blue-700";
      default:      return "bg-gray-100 text-gray-600";
    }
  }

  openAdd(): void {
    this.dialog
      .open(UserFormComponent, {
        data: { user: undefined } as UserFormData,
        width: '480px',
      })
      .afterClosed()
      .subscribe((result: CreateUserRequest | undefined) => {
        if (!result) return;
        this.userService
          .create(result)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snackBar.open('User created', undefined, { duration: 2000 });
              this.loadUsers();
            },
            error: (err) => {
              const msg = err?.error?.error ?? 'Failed to create user';
              this.snackBar.open(msg, 'Dismiss', { duration: 3000 });
            },
          });
      });
  }

  openEdit(user: User): void {
    this.dialog
      .open(UserFormComponent, {
        data: { user } as UserFormData,
        width: '480px',
      })
      .afterClosed()
      .subscribe((result: UpdateUserRolesRequest | undefined) => {
        if (!result) return;
        this.userService
          .updateRoles(user.id, result)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snackBar.open('Roles updated', undefined, { duration: 2000 });
              this.loadUsers();
            },
            error: () =>
              this.snackBar.open('Failed to update roles', 'Dismiss', { duration: 3000 }),
          });
      });
  }

  openDelete(user: User): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Delete User',
          message: `Are you sure you want to delete "${user.username}"? They will be permanently removed and will no longer be able to log in.`,
          confirmLabel: 'Delete',
          danger: true,
        } as ConfirmDialogData,
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.userService
          .delete(user.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snackBar.open('User deleted', undefined, { duration: 2000 });
              this.loadUsers();
            },
            error: () =>
              this.snackBar.open('Failed to delete user', 'Dismiss', { duration: 3000 }),
          });
      });
  }
}