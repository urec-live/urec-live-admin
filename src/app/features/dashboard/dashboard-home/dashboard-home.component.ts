import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith, switchMap, forkJoin } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgChartsModule } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { LiveSnapshot, UsageStats, PeakHours, ActivityLogEntry } from '../../../core/models/analytics.model';

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonToggleModule,
    MatIconModule,
    MatListModule,
    MatProgressSpinnerModule,
    NgChartsModule,
  ],
  template: `
    <div class="p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-800">Dashboard</h1>
        <span class="text-sm text-gray-500">Live gym overview</span>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <mat-card class="stat-card">
          <mat-card-content class="pt-4">
            <div class="flex items-center gap-3">
              <mat-icon class="text-indigo-500" style="font-size:36px;width:36px;height:36px">fitness_center</mat-icon>
              <div>
                <p class="text-2xl font-bold text-gray-800">{{ snapshot?.totalMachines ?? '—' }}</p>
                <p class="text-xs text-gray-500 uppercase tracking-wide">Total Machines</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content class="pt-4">
            <div class="flex items-center gap-3">
              <mat-icon class="text-red-500" style="font-size:36px;width:36px;height:36px">person</mat-icon>
              <div>
                <p class="text-2xl font-bold text-gray-800">{{ snapshot?.occupiedMachines ?? '—' }}</p>
                <p class="text-xs text-gray-500 uppercase tracking-wide">In Use</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content class="pt-4">
            <div class="flex items-center gap-3">
              <mat-icon class="text-green-500" style="font-size:36px;width:36px;height:36px">check_circle</mat-icon>
              <div>
                <p class="text-2xl font-bold text-gray-800">{{ snapshot?.availableMachines ?? '—' }}</p>
                <p class="text-xs text-gray-500 uppercase tracking-wide">Available</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content class="pt-4">
            <div class="flex items-center gap-3">
              <mat-icon class="text-blue-500" style="font-size:36px;width:36px;height:36px">group</mat-icon>
              <div>
                <p class="text-2xl font-bold text-gray-800">{{ snapshot?.activeUsers ?? '—' }}</p>
                <p class="text-xs text-gray-500 uppercase tracking-wide">Active Users</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Period Toggle -->
      <div class="flex items-center gap-3">
        <span class="text-sm font-medium text-gray-600">Period:</span>
        <mat-button-toggle-group [value]="period" (change)="onPeriodChange($event.value)">
          <mat-button-toggle value="week">Week</mat-button-toggle>
          <mat-button-toggle value="month">Month</mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Equipment Usage Chart -->
        <mat-card>
          <mat-card-header>
            <mat-card-title class="text-base">Equipment Usage</mat-card-title>
            <mat-card-subtitle>Sessions per machine (top 10)</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="pt-4">
            @if (chartsLoading) {
              <div class="flex justify-center py-8">
                <mat-spinner diameter="40"></mat-spinner>
              </div>
            } @else if (usageChartData.labels?.length) {
              <canvas baseChart
                [data]="usageChartData"
                [options]="usageChartOptions"
                type="bar">
              </canvas>
            } @else {
              <p class="text-gray-400 text-center py-8">No data available</p>
            }
          </mat-card-content>
        </mat-card>

        <!-- Peak Hours Chart -->
        <mat-card>
          <mat-card-header>
            <mat-card-title class="text-base">Peak Hours</mat-card-title>
            <mat-card-subtitle>Sessions by hour of day</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="pt-4">
            @if (chartsLoading) {
              <div class="flex justify-center py-8">
                <mat-spinner diameter="40"></mat-spinner>
              </div>
            } @else if (peakHoursChartData.labels?.length) {
              <canvas baseChart
                [data]="peakHoursChartData"
                [options]="peakHoursChartOptions"
                type="bar">
              </canvas>
            } @else {
              <p class="text-gray-400 text-center py-8">No data available</p>
            }
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Recent Activity -->
      <mat-card>
        <mat-card-header>
          <mat-card-title class="text-base">Recent Activity</mat-card-title>
          <mat-card-subtitle>Last 10 events</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (activityLog.length === 0) {
            <p class="text-gray-400 text-center py-4">No recent activity</p>
          } @else {
            <mat-list>
              @for (entry of activityLog; track entry.id) {
                <mat-list-item>
                  <mat-icon matListItemIcon
                    [class]="entry.eventType === 'CHECK_IN' ? 'text-green-500' : 'text-gray-400'">
                    {{ entry.eventType === 'CHECK_IN' ? 'login' : 'logout' }}
                  </mat-icon>
                  <span matListItemTitle>
                    <strong>{{ entry.username }}</strong> — {{ entry.description }}
                  </span>
                  <span matListItemLine class="text-xs text-gray-400">
                    {{ relativeTime(entry.timestamp) }}
                  </span>
                </mat-list-item>
              }
            </mat-list>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .stat-card {
      transition: box-shadow 0.2s;
    }
    .stat-card:hover {
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    }
  `]
})
export class DashboardHomeComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);

  snapshot: LiveSnapshot | null = null;
  period: 'week' | 'month' = 'week';
  chartsLoading = true;
  activityLog: ActivityLogEntry[] = [];

  usageChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  peakHoursChartData: ChartData<'bar'> = { labels: [], datasets: [] };

  usageChartOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, title: { display: true, text: 'Sessions' } } },
  };

  peakHoursChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, title: { display: true, text: 'Sessions' } } },
  };

  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // Auto-refresh live snapshot every 30s
    interval(30000)
      .pipe(startWith(0), takeUntilDestroyed(this.destroyRef), switchMap(() => this.analyticsService.getLiveSnapshot()))
      .subscribe((snap) => (this.snapshot = snap));

    // Load activity log once
    this.analyticsService.getActivityLog(0, 10)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((log) => (this.activityLog = log));

    // Load period-based charts
    this.loadCharts();
  }

  onPeriodChange(period: 'week' | 'month'): void {
    this.period = period;
    this.loadCharts();
  }

  private loadCharts(): void {
    this.chartsLoading = true;
    forkJoin({
      usage: this.analyticsService.getUsageStats(this.period),
      peaks: this.analyticsService.getPeakHours(this.period),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ usage, peaks }) => {
          this.buildUsageChart(usage);
          this.buildPeakHoursChart(peaks);
          this.chartsLoading = false;
        },
        error: () => (this.chartsLoading = false),
      });
  }

  private buildUsageChart(stats: UsageStats): void {
    const top10 = stats.mostUsed.slice(0, 10);
    this.usageChartData = {
      labels: top10.map((m) => m.machineName),
      datasets: [
        {
          data: top10.map((m) => m.sessionCount),
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderColor: 'rgb(99, 102, 241)',
          borderWidth: 1,
        },
      ],
    };
  }

  private buildPeakHoursChart(peaks: PeakHours): void {
    const all24 = Array.from({ length: 24 }, (_, h) => {
      const found = peaks.peakHours.find((p) => p.hour === h);
      return { hour: h, count: found?.count ?? 0 };
    });
    this.peakHoursChartData = {
      labels: all24.map((h) => this.formatHour(h.hour)),
      datasets: [
        {
          data: all24.map((h) => h.count),
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
        },
      ],
    };
  }

  private formatHour(h: number): string {
    if (h === 0) return '12am';
    if (h === 12) return '12pm';
    return h < 12 ? `${h}am` : `${h - 12}pm`;
  }

  relativeTime(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }
}
