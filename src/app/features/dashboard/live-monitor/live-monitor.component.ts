import { Component, OnInit, OnDestroy, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WebsocketService } from '../../../core/services/websocket.service';
import { EquipmentService } from '../../../core/services/equipment.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { Equipment } from '../../../core/models/equipment.model';
import { LiveSnapshot } from '../../../core/models/analytics.model';

@Component({
  selector: 'app-live-monitor',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <mat-icon class="text-green-500 animate-pulse">radio_button_checked</mat-icon>
          <h1 class="text-2xl font-bold text-gray-800">Live Monitor</h1>
        </div>
        <span class="text-sm text-gray-500">
          {{ wsConnected ? 'Real-time WebSocket' : 'Polling every 5s' }}
        </span>
      </div>

      <!-- Snapshot Stats -->
      @if (snapshot) {
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div class="bg-white rounded-lg p-3 shadow-sm text-center">
            <p class="text-xl font-bold text-gray-800">{{ snapshot.totalMachines }}</p>
            <p class="text-xs text-gray-500">Total</p>
          </div>
          <div class="bg-red-50 rounded-lg p-3 shadow-sm text-center">
            <p class="text-xl font-bold text-red-600">{{ snapshot.occupiedMachines }}</p>
            <p class="text-xs text-gray-500">In Use</p>
          </div>
          <div class="bg-green-50 rounded-lg p-3 shadow-sm text-center">
            <p class="text-xl font-bold text-green-600">{{ snapshot.availableMachines }}</p>
            <p class="text-xs text-gray-500">Available</p>
          </div>
          <div class="bg-yellow-50 rounded-lg p-3 shadow-sm text-center">
            <p class="text-xl font-bold text-yellow-600">{{ snapshot.reservedMachines }}</p>
            <p class="text-xs text-gray-500">Reserved</p>
          </div>
          <div class="bg-blue-50 rounded-lg p-3 shadow-sm text-center">
            <p class="text-xl font-bold text-blue-600">{{ snapshot.activeUsers }}</p>
            <p class="text-xs text-gray-500">Active Users</p>
          </div>
        </div>
      }

      <!-- Equipment Grid -->
      @if (loading) {
        <div class="flex justify-center py-12">
          <mat-spinner diameter="48"></mat-spinner>
        </div>
      } @else {
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          @for (machine of machines; track machine.id) {
            <div [class]="cardClass(machine.status)"
                 class="rounded-xl p-4 shadow-sm transition-all duration-300">
              <div class="flex items-start justify-between mb-2">
                <mat-icon class="text-lg" [class]="iconClass(machine.status)">
                  fitness_center
                </mat-icon>
                <span [class]="badgeClass(machine.status)"
                      class="text-xs font-medium px-2 py-0.5 rounded-full">
                  {{ machine.status }}
                </span>
              </div>
              <p class="text-sm font-semibold text-gray-800 leading-tight">{{ machine.name }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ machine.code }}</p>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class LiveMonitorComponent implements OnInit, OnDestroy {
  private wsService = inject(WebsocketService);
  private equipmentService = inject(EquipmentService);
  private analyticsService = inject(AnalyticsService);
  private destroyRef = inject(DestroyRef);

  machines: Equipment[] = [];
  snapshot: LiveSnapshot | null = null;
  wsConnected = false;
  loading = true;

  private pollSub?: Subscription;

  ngOnInit(): void {
    this.analyticsService.getLiveSnapshot()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((s) => (this.snapshot = s));

    this.wsService.connect();

    // If WebSocket does not emit within 3s, fall back to polling
    const fallbackTimer = timer(3000).subscribe(() => {
      if (!this.wsConnected) {
        this.startPolling();
      }
      fallbackTimer.unsubscribe();
    });

    this.wsService.machineUpdates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (equipment) => {
          this.wsConnected = true;
          this.machines = equipment;
          this.loading = false;
          this.pollSub?.unsubscribe();
        },
        error: () => {
          if (!this.wsConnected) this.startPolling();
        },
      });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.wsService.disconnect();
  }

  private startPolling(): void {
    this.loading = false;
    this.pollSub = interval(5000)
      .pipe(switchMap(() => this.equipmentService.getAll()))
      .subscribe((equipment) => (this.machines = equipment));

    // Load immediately
    this.equipmentService.getAll().subscribe((equipment) => {
      this.machines = equipment;
      this.loading = false;
    });
  }

  cardClass(status: string): string {
    switch (status) {
      case 'Available': return 'bg-green-50 border border-green-200';
      case 'In Use': return 'bg-red-50 border border-red-200';
      case 'Reserved': return 'bg-yellow-50 border border-yellow-200';
      default: return 'bg-gray-50 border border-gray-200';
    }
  }

  iconClass(status: string): string {
    switch (status) {
      case 'Available': return 'text-green-500';
      case 'In Use': return 'text-red-500';
      case 'Reserved': return 'text-yellow-500';
      default: return 'text-gray-400';
    }
  }

  badgeClass(status: string): string {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-700';
      case 'In Use': return 'bg-red-100 text-red-700';
      case 'Reserved': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  }
}
