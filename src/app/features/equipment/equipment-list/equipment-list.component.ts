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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { SelectionModel } from '@angular/cdk/collections';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Equipment, EquipmentStatus } from '../../../core/models/equipment.model';
import { EquipmentService } from '../../../core/services/equipment.service';
import {
  EquipmentFormComponent,
  EquipmentFormData,
} from '../equipment-form/equipment-form.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  QrDialogComponent,
  QrDialogData,
} from '../qr-dialog/qr-dialog.component';
import QRCode from 'qrcode';

interface FilterState {
  search: string;
  status: string;
}

@Component({
  selector: 'app-equipment-list',
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
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatCardModule,
  ],
  template: `
    <div class="p-6 max-w-screen-xl mx-auto">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-semibold text-gray-800">Equipment</h1>
          <p class="text-sm text-gray-500 mt-0.5">
            Manage gym machines and generate QR codes
          </p>
        </div>
        <button mat-flat-button color="primary" (click)="openAdd()">
          <mat-icon>add</mat-icon>
          Add Equipment
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
              placeholder="Name or code…"
            />
            <mat-icon matSuffix class="text-gray-400">search</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-40 !mb-0">
            <mat-label>Status</mat-label>
            <mat-select [(ngModel)]="statusFilter" (ngModelChange)="applyFilter()">
              <mat-option value="">All</mat-option>
              @for (s of statuses; track s) {
                <mat-option [value]="s">{{ s }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          @if (selection.selected.length > 0) {
            <button mat-stroked-button color="primary" (click)="printBulkQr()" class="!h-14">
              <mat-icon>qr_code</mat-icon>
              Print {{ selection.selected.length }} QR Code{{
                selection.selected.length > 1 ? 's' : ''
              }}
            </button>
          }
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
            <!-- Checkbox column -->
            <ng-container matColumnDef="select">
              <th mat-header-cell *matHeaderCellDef class="w-12">
                <mat-checkbox
                  [checked]="isAllSelected()"
                  [indeterminate]="selection.hasValue() && !isAllSelected()"
                  (change)="toggleAll()"
                />
              </th>
              <td mat-cell *matCellDef="let row">
                <mat-checkbox
                  [checked]="selection.isSelected(row)"
                  (change)="selection.toggle(row)"
                />
              </td>
            </ng-container>

            <!-- Name column -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
              <td mat-cell *matCellDef="let e">
                <span class="font-medium text-gray-800">{{ e.name }}</span>
              </td>
            </ng-container>

            <!-- Code column -->
            <ng-container matColumnDef="code">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Code</th>
              <td mat-cell *matCellDef="let e">
                <code class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{{
                  e.code
                }}</code>
              </td>
            </ng-container>

            <!-- Status column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
              <td mat-cell *matCellDef="let e">
                <span
                  [class]="statusClass(e.status)"
                  class="px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                >
                  {{ e.status }}
                </span>
              </td>
            </ng-container>

            <!-- Muscle Groups column -->
            <ng-container matColumnDef="muscleGroups">
              <th mat-header-cell *matHeaderCellDef>Muscle Groups</th>
              <td mat-cell *matCellDef="let e">
                <div class="flex flex-wrap gap-1">
                  @for (mg of getMuscleGroups(e); track mg) {
                    <span
                      class="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full"
                      >{{ mg }}</span
                    >
                  }
                  @if (getMuscleGroups(e).length === 0) {
                    <span class="text-xs text-gray-400">—</span>
                  }
                </div>
              </td>
            </ng-container>

            <!-- Actions column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="w-32"></th>
              <td mat-cell *matCellDef="let e">
                <div class="flex items-center">
                  <button mat-icon-button matTooltip="View QR Code" (click)="openQr(e)">
                    <mat-icon class="!text-[20px] text-gray-400">qr_code</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Edit" (click)="openEdit(e)">
                    <mat-icon class="!text-[20px] text-gray-400">edit</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Delete" (click)="openDelete(e)">
                    <mat-icon class="!text-[20px] text-red-400">delete</mat-icon>
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns" class="bg-gray-50"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: columns"
              class="hover:bg-gray-50 transition-colors"
            ></tr>

            <tr class="mat-row" *matNoDataRow>
              <td
                class="mat-cell py-12 text-center text-gray-400"
                [attr.colspan]="columns.length"
              >
                @if (searchTerm || statusFilter) {
                  No equipment matches your filters.
                } @else {
                  No equipment found. Add your first machine!
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
export class EquipmentListComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private equipmentService = inject(EquipmentService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  columns = ['select', 'name', 'code', 'status', 'muscleGroups', 'actions'];
  statuses: EquipmentStatus[] = ['Available', 'In Use', 'Reserved'];

  loading = signal(false);
  dataSource = new MatTableDataSource<Equipment>([]);
  selection = new SelectionModel<Equipment>(true, []);

  searchTerm = '';
  statusFilter = '';

  ngOnInit(): void {
    this.dataSource.filterPredicate = (data: Equipment, filter: string) => {
      const f = JSON.parse(filter) as FilterState;
      const matchesSearch =
        !f.search ||
        data.name.toLowerCase().includes(f.search) ||
        data.code.toLowerCase().includes(f.search);
      const matchesStatus = !f.status || data.status === f.status;
      return matchesSearch && matchesStatus;
    };
    this.loadEquipment();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadEquipment(): void {
    this.loading.set(true);
    this.selection.clear();
    this.equipmentService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (equipment) => {
          this.dataSource.data = equipment.filter((e) => !e.deleted);
          this.loading.set(false);
        },
        error: () => {
          this.snackBar.open('Failed to load equipment', 'Dismiss', {
            duration: 3000,
          });
          this.loading.set(false);
        },
      });
  }

  applyFilter(): void {
    this.dataSource.filter = JSON.stringify({
      search: this.searchTerm.toLowerCase().trim(),
      status: this.statusFilter,
    } satisfies FilterState);
    this.dataSource.paginator?.firstPage();
  }

  getMuscleGroups(equipment: Equipment): string[] {
    const groups = (equipment.exercises ?? []).map((e) => e.muscleGroup);
    return [...new Set(groups)];
  }

  statusClass(status: EquipmentStatus): string {
    switch (status) {
      case 'Available':
        return 'bg-green-100 text-green-700';
      case 'In Use':
        return 'bg-blue-100 text-blue-700';
      case 'Reserved':
        return 'bg-amber-100 text-amber-700';
    }
  }

  isAllSelected(): boolean {
    return (
      this.selection.selected.length === this.dataSource.filteredData.length &&
      this.dataSource.filteredData.length > 0
    );
  }

  toggleAll(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.dataSource.filteredData.forEach((row) => this.selection.select(row));
    }
  }

  openAdd(): void {
    this.dialog
      .open(EquipmentFormComponent, {
        data: { equipment: undefined } as EquipmentFormData,
        width: '480px',
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        this.equipmentService
          .create(result)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snackBar.open('Equipment added', undefined, {
                duration: 2000,
              });
              this.loadEquipment();
            },
            error: () =>
              this.snackBar.open('Failed to add equipment', 'Dismiss', {
                duration: 3000,
              }),
          });
      });
  }

  openEdit(equipment: Equipment): void {
    this.dialog
      .open(EquipmentFormComponent, {
        data: { equipment } as EquipmentFormData,
        width: '480px',
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        this.equipmentService
          .update(equipment.id, result)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snackBar.open('Equipment updated', undefined, {
                duration: 2000,
              });
              this.loadEquipment();
            },
            error: () =>
              this.snackBar.open('Failed to update equipment', 'Dismiss', {
                duration: 3000,
              }),
          });
      });
  }

  openDelete(equipment: Equipment): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Delete Equipment',
          message: `Are you sure you want to delete "${equipment.name}"? This cannot be undone.`,
          confirmLabel: 'Delete',
          danger: true,
        } as ConfirmDialogData,
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.equipmentService
          .delete(equipment.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.snackBar.open('Equipment deleted', undefined, {
                duration: 2000,
              });
              this.loadEquipment();
            },
            error: () =>
              this.snackBar.open('Failed to delete equipment', 'Dismiss', {
                duration: 3000,
              }),
          });
      });
  }

  openQr(equipment: Equipment): void {
    this.dialog.open(QrDialogComponent, {
      data: { equipment } as QrDialogData,
      width: '360px',
    });
  }

  async printBulkQr(): Promise<void> {
    const items: { name: string; code: string; url: string }[] = [];
    for (const equipment of this.selection.selected) {
      const url = await QRCode.toDataURL(equipment.code, {
        width: 300,
        margin: 2,
      });
      items.push({ name: equipment.name, code: equipment.code, url });
    }

    const win = window.open('');
    if (!win) return;

    const cards = items
      .map(
        (item) => `
      <div style="display:inline-block;text-align:center;margin:10px;padding:16px;
                  border:1px solid #e2e8f0;border-radius:8px;width:180px;vertical-align:top">
        <img src="${item.url}" style="width:150px;height:150px">
        <p style="font-weight:600;margin:6px 0 2px;font-size:13px;color:#1e293b">${item.name}</p>
        <p style="font-family:monospace;font-size:11px;color:#64748b;margin:0">${item.code}</p>
      </div>`,
      )
      .join('');

    win.document.write(`<!DOCTYPE html>
      <html><head><title>QR Codes — UREC Live</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        h2 { color: #1e1b4b; margin-bottom: 4px; }
        .sub { color: #64748b; font-size: 13px; margin: 0 0 20px; }
        .print-btn { padding: 8px 18px; background: #4f46e5; color: #fff;
                     border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
        @media print { .no-print { display: none; } }
      </style>
      </head><body>
      <div class="no-print" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div>
          <h2>UREC Live — QR Codes</h2>
          <p class="sub">${items.length} machine${items.length > 1 ? 's' : ''}</p>
        </div>
        <button class="print-btn" onclick="window.print()">Print</button>
      </div>
      <div>${cards}</div>
      </body></html>`);
    win.document.close();
  }
}
