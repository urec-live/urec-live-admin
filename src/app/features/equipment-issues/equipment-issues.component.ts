import {
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  WritableSignal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, interval } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleGroup, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggle, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EquipmentIssueService } from '../../core/services/equipment-issue.service';
import { EquipmentIssueStore } from '../../core/services/equipment-issue-store.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  EquipmentIssueGroup,
  EquipmentIssueReport,
  ISSUE_SEVERITY_LABELS,
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  IssueSeverity,
  IssueStatus,
  isOutOfOrder,
} from '../../core/models/equipment-issue.model';

export const AUTO_REFRESH_MS = 30_000;

/** Recomputes a group's header fields after its reports change locally (mirrors the backend). */
function withDerivedFields(group: EquipmentIssueGroup): EquipmentIssueGroup {
  const open = group.reports.filter((r) => r.status !== 'RESOLVED');
  const worstSeverity: IssueSeverity | null = open.some((r) => r.severity === 'OUT_OF_ORDER')
    ? 'OUT_OF_ORDER'
    : open.length > 0 ? 'DAMAGED' : null;
  return { ...group, openReportCount: open.length, worstSeverity };
}

@Component({
  selector: 'app-equipment-issues',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    NgClass,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  styles: [`
    :host ::ng-deep .issue-toggle .mat-button-toggle-label-content {
      line-height: 30px;
      padding: 0 10px;
      font-size: 12px;
    }
  `],
  template: `
    <div class="p-6 max-w-screen-xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-semibold text-gray-800">Equipment Issues</h1>
          <p class="text-sm text-gray-500 mt-0.5">Machines members have reported as broken or damaged</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 text-sm text-gray-500">
            <mat-slide-toggle [(ngModel)]="autoRefresh" (ngModelChange)="toggleAutoRefresh()" color="primary">
            </mat-slide-toggle>
            <span>Auto-refresh</span>
          </div>
          <button mat-icon-button matTooltip="Refresh now" (click)="loadAll()" [disabled]="loading()">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <mat-card class="!py-4 !px-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <mat-icon class="text-red-600">notification_important</mat-icon>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-800" data-testid="stat-reported">{{ summary()?.reported ?? '—' }}</p>
              <p class="text-xs text-gray-500">Awaiting review</p>
            </div>
          </div>
        </mat-card>
        <mat-card class="!py-4 !px-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <mat-icon class="text-blue-600">visibility</mat-icon>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-800" data-testid="stat-acknowledged">{{ summary()?.acknowledged ?? '—' }}</p>
              <p class="text-xs text-gray-500">Acknowledged</p>
            </div>
          </div>
        </mat-card>
        <mat-card class="!py-4 !px-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <mat-icon class="text-indigo-600">build</mat-icon>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-800" data-testid="stat-in-progress">{{ summary()?.inProgress ?? '—' }}</p>
              <p class="text-xs text-gray-500">Repair in progress</p>
            </div>
          </div>
        </mat-card>
        <mat-card class="!py-4 !px-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <mat-icon class="text-amber-600">fitness_center</mat-icon>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-800" data-testid="stat-machines">{{ summary()?.affectedMachines ?? '—' }}</p>
              <p class="text-xs text-gray-500">{{ summary()?.affectedMachines === 1 ? 'Machine' : 'Machines' }} affected</p>
              @if (summary()?.outOfOrderMachines; as outOfOrderCount) {
                <p class="text-xs font-medium text-gray-700" data-testid="stat-out-of-order">{{ outOfOrderCount }} out of order</p>
              }
            </div>
          </div>
        </mat-card>
      </div>

      <!-- Filters -->
      <mat-card class="mb-4">
        <mat-card-content class="!flex flex-wrap items-center gap-3 !py-3">
          <mat-form-field appearance="outline" class="flex-1 min-w-[180px] !mb-0">
            <mat-label>Search machines</mat-label>
            <input matInput [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Name or code…" />
            <mat-icon matSuffix class="text-gray-400">search</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-48 !mb-0">
            <mat-label>Severity</mat-label>
            <mat-select [ngModel]="severityFilter()" (ngModelChange)="severityFilter.set($event)">
              <mat-option value="">All severities</mat-option>
              <mat-option value="OUT_OF_ORDER">{{ severityLabels.OUT_OF_ORDER }}</mat-option>
              <mat-option value="DAMAGED">{{ severityLabels.DAMAGED }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-slide-toggle [(ngModel)]="showResolved" (ngModelChange)="loadGroups()" color="primary">
            Show resolved
          </mat-slide-toggle>
        </mat-card-content>
      </mat-card>

      <!-- First load -->
      @if (loading() && groups().length === 0) {
        <div class="flex justify-center py-16">
          <mat-spinner diameter="48" />
        </div>
      }

      <!-- Empty -->
      @if (!loading() && filteredGroups().length === 0) {
        <mat-card class="!py-16 text-center" data-testid="empty-state">
          <mat-icon class="!w-12 !h-12 !text-5xl text-green-500">task_alt</mat-icon>
          <p class="text-lg font-medium text-gray-700 mt-2">
            {{ groups().length === 0 ? 'No open equipment issues' : 'No machines match your filters' }}
          </p>
          <p class="text-sm text-gray-500 mt-1">
            {{ groups().length === 0 ? 'Reports members file from the app will show up here.' : 'Try clearing the search or severity filter.' }}
          </p>
        </mat-card>
      }

      <!-- One panel per machine -->
      <mat-accordion multi class="block">
        @for (group of filteredGroups(); track group.equipmentId) {
          <mat-expansion-panel
            class="!mb-3 !rounded-xl"
            [expanded]="isExpanded(group.equipmentId)"
            (opened)="setExpanded(group.equipmentId, true)"
            (closed)="setExpanded(group.equipmentId, false)"
            [attr.data-testid]="'machine-' + group.equipmentId">
            <mat-expansion-panel-header collapsedHeight="68px" expandedHeight="68px">
              <mat-panel-title class="gap-3 min-w-0">
                <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                     [ngClass]="severityClass(group.worstSeverity)">
                  <mat-icon>{{ group.worstSeverity ? 'report_problem' : 'task_alt' }}</mat-icon>
                </div>
                <div class="min-w-0">
                  <p class="font-semibold text-gray-800 truncate">{{ group.equipmentName }}</p>
                  @if (group.equipmentCode) {
                    <code class="text-xs text-gray-500">{{ group.equipmentCode }}</code>
                  }
                </div>
              </mat-panel-title>
              <mat-panel-description class="justify-end gap-3">
                @if (isOutOfOrder(group.equipmentStatus)) {
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-gray-200 text-gray-700"
                        data-testid="out-of-order-chip">Out of order</span>
                }
                @if (group.worstSeverity; as severity) {
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                        [ngClass]="severityClass(severity)">{{ severityLabels[severity] }}</span>
                } @else {
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-green-100 text-green-700">
                    All resolved
                  </span>
                }
                <span class="text-xs text-gray-500 whitespace-nowrap">
                  {{ group.openReportCount }} open {{ group.openReportCount === 1 ? 'report' : 'reports' }}
                </span>
                <span class="text-xs text-gray-400 whitespace-nowrap"
                      [matTooltip]="(group.latestReportedAt | date:'medium') ?? ''">
                  {{ relativeTime(group.latestReportedAt) }}
                </span>
              </mat-panel-description>
            </mat-expansion-panel-header>

            <div class="flex flex-wrap items-center gap-x-8 gap-y-3 pb-3 border-b border-gray-100">
              <mat-slide-toggle
                #outOfOrderToggle
                color="warn"
                [checked]="isOutOfOrder(group.equipmentStatus)"
                [disabled]="savingAvailability().has(group.equipmentId)"
                (change)="onOutOfOrderChange(group, $event.checked, outOfOrderToggle)"
                matTooltip="Members can't check in while a machine is out of order"
                [attr.data-testid]="'out-of-order-toggle-' + group.equipmentId">
                Out of order
              </mat-slide-toggle>
              @if (group.openReportCount > 0) {
                <div class="flex flex-wrap items-center gap-3">
                  <span class="text-sm text-gray-600">Set all open reports to:</span>
                  <mat-button-toggle-group
                    #machineToggle="matButtonToggleGroup"
                    class="issue-toggle"
                    [value]="machineStatus(group)"
                    (change)="onMachineStatusChange(group, $event.value, machineToggle)"
                    [disabled]="savingMachines().has(group.equipmentId)"
                    aria-label="Status for all open reports on this machine">
                    @for (status of statuses; track status) {
                      <mat-button-toggle [value]="status">{{ statusLabels[status] }}</mat-button-toggle>
                    }
                  </mat-button-toggle-group>
                </div>
              }
            </div>

            @for (report of group.reports; track report.id) {
              <div class="py-4 border-b last:border-b-0 border-gray-100" [attr.data-testid]="'report-' + report.id">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                      <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                            [ngClass]="severityClass(report.severity)">{{ severityLabels[report.severity] }}</span>
                      <span class="text-sm font-medium text-gray-800">{{ report.reporterUsername }}</span>
                      <span class="text-xs text-gray-400">{{ report.reportedAt | date:'MMM d, y, h:mm a' }}</span>
                    </div>
                    <p class="text-sm text-gray-700 whitespace-pre-line break-words">{{ report.description }}</p>
                    @if (report.resolvedAt) {
                      <p class="text-xs text-green-600 mt-1">Resolved {{ report.resolvedAt | date:'MMM d, y, h:mm a' }}</p>
                    }
                  </div>
                  <mat-button-toggle-group
                    #reportToggle="matButtonToggleGroup"
                    class="issue-toggle"
                    [value]="report.status"
                    (change)="onReportStatusChange(report, $event.value, reportToggle)"
                    [disabled]="savingReports().has(report.id)"
                    [attr.aria-label]="'Status for report ' + report.id">
                    @for (status of statuses; track status) {
                      <mat-button-toggle [value]="status">{{ statusLabels[status] }}</mat-button-toggle>
                    }
                  </mat-button-toggle-group>
                </div>
              </div>
            }
          </mat-expansion-panel>
        }
      </mat-accordion>

    </div>
  `,
})
export class EquipmentIssuesComponent implements OnInit, OnDestroy {
  private issueService = inject(EquipmentIssueService);
  private store = inject(EquipmentIssueStore);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private stopRefresh$ = new Subject<void>();

  readonly statuses = ISSUE_STATUSES;
  readonly statusLabels = ISSUE_STATUS_LABELS;
  readonly severityLabels = ISSUE_SEVERITY_LABELS;
  readonly summary = this.issueService.summary;
  readonly isOutOfOrder = isOutOfOrder;

  // State
  loading = signal(false);
  groups = signal<EquipmentIssueGroup[]>([]);
  /** Report / machine ids with a status change still saving */
  savingReports = signal<ReadonlySet<number>>(new Set());
  savingMachines = signal<ReadonlySet<number>>(new Set());
  /** Machine ids whose out-of-order switch is still saving */
  savingAvailability = signal<ReadonlySet<number>>(new Set());

  // Filters
  search = signal('');
  severityFilter = signal<IssueSeverity | ''>('');
  showResolved = false;
  autoRefresh = true;

  /** Open panels. A machine seen for the first time with new reports opens automatically. */
  private expanded = new Set<number>();
  private seenMachines = new Set<number>();

  filteredGroups = computed(() => {
    const term = this.search().trim().toLowerCase();
    const severity = this.severityFilter();
    return this.groups().filter((group) => {
      const matchesTerm = !term
        || group.equipmentName.toLowerCase().includes(term)
        || (group.equipmentCode ?? '').toLowerCase().includes(term);
      const matchesSeverity = !severity || group.reports.some((r) => r.severity === severity);
      return matchesTerm && matchesSeverity;
    });
  });

  ngOnInit(): void {
    this.loadAll();
    this.toggleAutoRefresh();
    // A newly filed report shows up right away instead of on the next auto-refresh
    this.store.arrivals$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.isSaving()) this.loadGroups();
      });
  }

  ngOnDestroy(): void {
    this.stopRefresh$.next();
    this.stopRefresh$.complete();
  }

  loadAll(): void {
    this.refreshSummary();
    this.loadGroups();
  }

  loadGroups(): void {
    this.loading.set(true);
    this.issueService.getGrouped(this.showResolved)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (groups) => {
          this.applyGroups(groups);
          this.loading.set(false);
        },
        error: () => {
          this.snackBar.open('Failed to load equipment issues', 'Dismiss', { duration: 3000 });
          this.loading.set(false);
        },
      });
  }

  toggleAutoRefresh(): void {
    this.stopRefresh$.next(); // stop any existing interval
    if (this.autoRefresh) {
      interval(AUTO_REFRESH_MS)
        .pipe(takeUntil(this.stopRefresh$))
        .subscribe(() => {
          // Don't let a refresh overwrite a change that's still saving
          if (!this.isSaving()) this.loadAll();
        });
    }
  }

  /** Resolving asks first; other status changes save straight away. */
  onReportStatusChange(report: EquipmentIssueReport, status: IssueStatus, toggle?: MatButtonToggleGroup): void {
    if (status === report.status) return;
    if (status !== 'RESOLVED') {
      this.applyReportStatus(report, status, toggle);
      return;
    }

    const group = this.groups().find((g) => g.equipmentId === report.equipmentId);
    const lastOpenOnOutOfOrder = !!group && isOutOfOrder(group.equipmentStatus) && group.openReportCount === 1;
    this.confirm(
      `This resolves ${report.reporterUsername}'s report on ${report.equipmentName}. They'll see it as Fixed.`
        + (lastOpenOnOutOfOrder ? ` ${report.equipmentName} goes back in service.` : ''),
      'Yes, resolve',
      () => this.applyReportStatus(report, status, toggle),
      // Nothing was sent, so just put the toggle back
      () => { if (toggle) toggle.value = report.status; },
    );
  }

  /** "Set all open reports to …" always asks first. */
  onMachineStatusChange(group: EquipmentIssueGroup, status: IssueStatus, toggle?: MatButtonToggleGroup): void {
    const openCount = group.reports.filter((r) => r.status !== 'RESOLVED').length;
    if (openCount === 0) return;

    const which = openCount === 1 ? 'the open report' : `all ${openCount} open reports`;
    const resolving = status === 'RESOLVED';
    this.confirm(
      resolving
        ? `This resolves ${which} on ${group.equipmentName}. Members will see ${openCount === 1 ? 'it' : 'them'} as Fixed.`
          + (isOutOfOrder(group.equipmentStatus) ? ` ${group.equipmentName} goes back in service.` : '')
        : `This sets ${which} on ${group.equipmentName} to ${ISSUE_STATUS_LABELS[status]}.`,
      resolving
        ? (openCount === 1 ? 'Yes, resolve' : 'Yes, resolve all')
        : `Yes, set all to ${ISSUE_STATUS_LABELS[status]}`,
      () => this.applyMachineStatus(group, status, toggle),
      // `group` is unchanged, so this is the status the toggle showed before the click
      () => { if (toggle) toggle.value = this.machineStatus(group); },
    );
  }

  private applyReportStatus(report: EquipmentIssueReport, status: IssueStatus, toggle?: MatButtonToggleGroup): void {
    const previous = report.status;
    if (status === previous) return;

    // Update the model right away so the machine header stays in step with the toggle
    this.patchReport(report.equipmentId, report.id, { status });
    this.markSaving(this.savingReports, report.id, true);

    this.issueService.updateStatus(report.id, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.patchReport(report.equipmentId, report.id, updated);
          this.markSaving(this.savingReports, report.id, false);
          const backInService = status === 'RESOLVED' && this.showBackInServiceIfFixed(report.equipmentId);
          this.snackBar.open(
            backInService
              ? `Report marked Resolved · ${report.equipmentName} is back in service`
              : `Report marked ${ISSUE_STATUS_LABELS[status]}`,
            undefined,
            { duration: 2500 },
          );
          this.refreshSummary();
        },
        error: () => {
          this.patchReport(report.equipmentId, report.id, { status: previous });
          // Reset the toggle directly: if the failure lands in the same change-detection turn as
          // the click, the [value] binding never sees a change and would leave the toggle on.
          if (toggle) toggle.value = previous;
          this.markSaving(this.savingReports, report.id, false);
          this.snackBar.open('Failed to update status', 'Dismiss', { duration: 3000 });
        },
      });
  }

  private applyMachineStatus(group: EquipmentIssueGroup, status: IssueStatus, toggle?: MatButtonToggleGroup): void {
    const previous = new Map(
      group.reports
        .filter((r) => r.status !== 'RESOLVED')
        .map((r) => [r.id, r.status] as const),
    );
    if (previous.size === 0) return;

    this.updateReports(group.equipmentId, (r) => (previous.has(r.id) ? { ...r, status } : r));
    this.markSaving(this.savingMachines, group.equipmentId, true);

    this.issueService.updateMachineStatus(group.equipmentId, status)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          const fresh = new Map(updated.reports.map((r) => [r.id, r] as const));
          this.updateReports(group.equipmentId, (r) => fresh.get(r.id) ?? r);
          // The server puts the machine back in service when its last open report is resolved
          this.patchGroup(group.equipmentId, { equipmentStatus: updated.equipmentStatus });
          this.markSaving(this.savingMachines, group.equipmentId, false);
          const backInService = isOutOfOrder(group.equipmentStatus) && !isOutOfOrder(updated.equipmentStatus);
          this.snackBar.open(
            `Open reports on ${group.equipmentName} marked ${ISSUE_STATUS_LABELS[status]}`
              + (backInService ? ' · back in service' : ''),
            undefined,
            { duration: 2500 },
          );
          this.refreshSummary();
        },
        error: () => {
          this.updateReports(group.equipmentId, (r) => ({ ...r, status: previous.get(r.id) ?? r.status }));
          // `group` is the pre-change snapshot, so this is the status the toggle showed before
          if (toggle) toggle.value = this.machineStatus(group);
          this.markSaving(this.savingMachines, group.equipmentId, false);
          this.snackBar.open('Failed to update status', 'Dismiss', { duration: 3000 });
        },
      });
  }

  /** Takes a machine out of service (blocking check-ins) or puts it back. */
  onOutOfOrderChange(group: EquipmentIssueGroup, outOfOrder: boolean, toggle?: MatSlideToggle): void {
    const previousStatus = group.equipmentStatus;
    this.markSaving(this.savingAvailability, group.equipmentId, true);

    this.issueService.setOutOfOrder(group.equipmentId, outOfOrder)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (equipment) => {
          this.patchGroup(group.equipmentId, { equipmentStatus: equipment.status });
          this.markSaving(this.savingAvailability, group.equipmentId, false);
          this.snackBar.open(
            outOfOrder ? `${group.equipmentName} marked out of order` : `${group.equipmentName} is back in service`,
            undefined,
            { duration: 2500 },
          );
          this.refreshSummary();
        },
        error: () => {
          // Reset the switch directly, for the same reason as the status toggles
          if (toggle) toggle.checked = isOutOfOrder(previousStatus);
          this.markSaving(this.savingAvailability, group.equipmentId, false);
          this.snackBar.open('Failed to update the machine', 'Dismiss', { duration: 3000 });
        },
      });
  }

  /** The status every open report on the machine shares, or null when they differ. */
  machineStatus(group: EquipmentIssueGroup): IssueStatus | null {
    const open = group.reports.filter((r) => r.status !== 'RESOLVED');
    if (open.length === 0) return null;
    return open.every((r) => r.status === open[0].status) ? open[0].status : null;
  }

  isExpanded(equipmentId: number): boolean {
    return this.expanded.has(equipmentId);
  }

  setExpanded(equipmentId: number, open: boolean): void {
    if (open) this.expanded.add(equipmentId);
    else this.expanded.delete(equipmentId);
  }

  severityClass(severity: IssueSeverity | null): string {
    switch (severity) {
      case 'OUT_OF_ORDER': return 'bg-red-100 text-red-700';
      case 'DAMAGED':      return 'bg-amber-100 text-amber-700';
      default:             return 'bg-green-100 text-green-700';
    }
  }

  relativeTime(timestamp: string): string {
    const mins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private applyGroups(groups: EquipmentIssueGroup[]): void {
    for (const group of groups) {
      if (!this.seenMachines.has(group.equipmentId)) {
        this.seenMachines.add(group.equipmentId);
        if (group.reports.some((r) => r.status === 'REPORTED')) this.expanded.add(group.equipmentId);
      }
    }
    this.groups.set(groups);
  }

  private confirm(message: string, confirmLabel: string, onConfirm: () => void, onCancel: () => void): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: { title: 'Are you sure?', message, confirmLabel } as ConfirmDialogData,
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      // Closing the dialog any other way (Escape, backdrop) counts as Cancel
      .subscribe((confirmed) => (confirmed ? onConfirm() : onCancel()));
  }

  private isSaving(): boolean {
    return this.savingReports().size > 0 || this.savingMachines().size > 0 || this.savingAvailability().size > 0;
  }

  private patchGroup(equipmentId: number, changes: Partial<EquipmentIssueGroup>): void {
    this.groups.update((groups) => groups.map((group) =>
      group.equipmentId === equipmentId ? { ...group, ...changes } : group,
    ));
  }

  /**
   * Mirrors the server rule after a single report is resolved: an out-of-order machine with no open
   * reports left goes back in service. Returns whether that happened. Auto-refresh reconciles any drift.
   */
  private showBackInServiceIfFixed(equipmentId: number): boolean {
    const group = this.groups().find((g) => g.equipmentId === equipmentId);
    if (!group || group.openReportCount > 0 || !isOutOfOrder(group.equipmentStatus)) return false;
    this.patchGroup(equipmentId, { equipmentStatus: 'Available' });
    return true;
  }

  private patchReport(equipmentId: number, reportId: number, changes: Partial<EquipmentIssueReport>): void {
    this.updateReports(equipmentId, (r) => (r.id === reportId ? { ...r, ...changes } : r));
  }

  private updateReports(
    equipmentId: number,
    update: (report: EquipmentIssueReport) => EquipmentIssueReport,
  ): void {
    this.groups.update((groups) => groups.map((group) =>
      group.equipmentId === equipmentId
        ? withDerivedFields({ ...group, reports: group.reports.map(update) })
        : group,
    ));
  }

  private markSaving(target: WritableSignal<ReadonlySet<number>>, id: number, saving: boolean): void {
    target.update((ids) => {
      const next = new Set(ids);
      if (saving) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  private refreshSummary(): void {
    this.issueService.loadSummary()
      .pipe(catchError(() => EMPTY), takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }
}
