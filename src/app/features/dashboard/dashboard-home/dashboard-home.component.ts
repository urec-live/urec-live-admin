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
import { ChartData, ChartOptions, Plugin } from 'chart.js';
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

// ── Gradient bar plugin ──────────────────────────────────────────────────────
// Paints each bar with a left→right (horizontal) or bottom→top (vertical)
// canvas gradient so the effect is visible even for long/short bars.
const gradientBarPlugin: Plugin<'bar'> = {
  id: 'gradientBar',
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    chart.data.datasets.forEach((dataset: any, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      const isHorizontal = (chart.options as any).indexAxis === 'y';

      meta.data.forEach((bar: any, index: number) => {
        const { x, y, base, width, height } = bar.getProps(
          ['x', 'y', 'base', 'width', 'height'],
          true
        );

        let gradient: CanvasGradient;

        if (isHorizontal) {
          // horizontal bars: gradient left (darker) → right (lighter/brighter)
          const left = Math.min(base, x);
          const right = Math.max(base, x);
          gradient = ctx.createLinearGradient(left, 0, right, 0);
          gradient.addColorStop(0, 'rgba(99,102,241,0.55)');
          gradient.addColorStop(0.5, 'rgba(118,120,255,0.85)');
          gradient.addColorStop(1, 'rgba(139,92,246,1)');
        } else {
          // vertical bars: gradient bottom → top
          const top = Math.min(y, base);
          const bottom = Math.max(y, base);
          const intensity = dataset.data[index] / (Math.max(...dataset.data) || 1);
          if (intensity > 0.6) {
            gradient = ctx.createLinearGradient(0, bottom, 0, top);
            gradient.addColorStop(0, 'rgba(16,185,129,0.7)');
            gradient.addColorStop(1, 'rgba(52,211,153,1)');
          } else if (intensity > 0.3) {
            gradient = ctx.createLinearGradient(0, bottom, 0, top);
            gradient.addColorStop(0, 'rgba(34,197,94,0.55)');
            gradient.addColorStop(1, 'rgba(74,222,128,0.9)');
          } else {
            gradient = ctx.createLinearGradient(0, bottom, 0, top);
            gradient.addColorStop(0, 'rgba(34,197,94,0.25)');
            gradient.addColorStop(1, 'rgba(134,239,172,0.6)');
          }
        }

        (bar as any).options.backgroundColor = gradient;
      });
    });
  },
};

Chart.register(gradientBarPlugin);

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
    <div class="dashboard-wrapper">

      <!-- Header -->
      <div class="dashboard-header">
        <div class="header-left">
          <h1 class="dashboard-title">Dashboard</h1>
          <span class="dashboard-subtitle">Live gym overview</span>
        </div>
        <div class="live-badge">
          <span class="live-dot"></span>
          <span>Live</span>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="stats-grid">
        <div class="stat-card stat-indigo">
          <div class="stat-icon-wrap"><mat-icon>fitness_center</mat-icon></div>
          <div class="stat-info">
            <p class="stat-value">{{ snapshot?.totalMachines ?? '—' }}</p>
            <p class="stat-label">Total Machines</p>
          </div>
          <div class="stat-glow stat-glow-indigo"></div>
        </div>
        <div class="stat-card stat-red">
          <div class="stat-icon-wrap"><mat-icon>person</mat-icon></div>
          <div class="stat-info">
            <p class="stat-value">{{ snapshot?.occupiedMachines ?? '—' }}</p>
            <p class="stat-label">In Use</p>
          </div>
          <div class="stat-glow stat-glow-red"></div>
        </div>
        <div class="stat-card stat-green">
          <div class="stat-icon-wrap"><mat-icon>check_circle</mat-icon></div>
          <div class="stat-info">
            <p class="stat-value">{{ snapshot?.availableMachines ?? '—' }}</p>
            <p class="stat-label">Available</p>
          </div>
          <div class="stat-glow stat-glow-green"></div>
        </div>
        <div class="stat-card stat-blue">
          <div class="stat-icon-wrap"><mat-icon>group</mat-icon></div>
          <div class="stat-info">
            <p class="stat-value">{{ snapshot?.activeUsers ?? '—' }}</p>
            <p class="stat-label">Active Users</p>
          </div>
          <div class="stat-glow stat-glow-blue"></div>
        </div>
      </div>

      <!-- Period Toggle -->
      <div class="period-row">
        <span class="period-label">Period</span>
        <div class="period-toggle">
          <button class="toggle-btn" [class.active]="period === 'week'" (click)="onPeriodChange('week')">Week</button>
          <button class="toggle-btn" [class.active]="period === 'month'" (click)="onPeriodChange('month')">Month</button>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="charts-grid">

        <!-- Equipment Usage -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">Equipment Usage</h3>
              <p class="chart-subtitle">Sessions per machine · Top 10</p>
            </div>
            <div class="chart-badge chart-badge-indigo"><mat-icon>bar_chart</mat-icon></div>
          </div>

          @if (chartsLoading) {
            <div class="chart-loading"><div class="spinner-ring spinner-indigo"></div></div>
          } @else if (usageChartData.labels?.length) {
            <!-- rank list sits above the canvas for visual richness -->
            <div class="rank-list">
              @for (item of usageTopItems; track item.name; let i = $index) {
                <div class="rank-row">
                  <span class="rank-num" [class]="'rank-' + (i+1)">{{ i + 1 }}</span>
                  <span class="rank-name">{{ item.name }}</span>
                  <div class="rank-bar-wrap">
                    <div class="rank-bar" [style.width.%]="item.pct"></div>
                  </div>
                  <span class="rank-val">{{ item.count }}</span>
                </div>
              }
            </div>
          } @else {
            <p class="chart-empty">No data available</p>
          }
        </div>

        <!-- Peak Hours -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">Peak Hours</h3>
              <p class="chart-subtitle">Sessions by hour of day</p>
            </div>
            <div class="chart-badge chart-badge-green"><mat-icon>schedule</mat-icon></div>
          </div>
          <div class="chart-body">
            @if (chartsLoading) {
              <div class="chart-loading"><div class="spinner-ring spinner-green"></div></div>
            } @else if (peakHoursChartData.labels?.length) {
              <canvas baseChart
                [data]="peakHoursChartData"
                [options]="peakHoursChartOptions"
                type="bar">
              </canvas>
            } @else {
              <p class="chart-empty">No data available</p>
            }
          </div>
        </div>

      </div>

      <!-- Recent Activity -->
      <div class="chart-card activity-card">
        <div class="chart-header">
          <div>
            <h3 class="chart-title">Recent Activity</h3>
            <p class="chart-subtitle">Last 10 events</p>
          </div>
          <div class="chart-badge chart-badge-blue"><mat-icon>timeline</mat-icon></div>
        </div>
        <div class="activity-list">
          @if (activityLog.length === 0) {
            <p class="chart-empty" style="padding:2rem 0">No recent activity</p>
          } @else {
            @for (entry of activityLog; track entry.id) {
              <div class="activity-item">
                <div class="activity-icon-wrap"
                  [class.activity-checkin]="entry.eventType === 'CHECK_IN'"
                  [class.activity-checkout]="entry.eventType !== 'CHECK_IN'">
                  <mat-icon>{{ entry.eventType === 'CHECK_IN' ? 'login' : 'logout' }}</mat-icon>
                </div>
                <div class="activity-text">
                  <span class="activity-name">{{ entry.username }}</span>
                  <span class="activity-desc">{{ entry.description }}</span>
                </div>
                <span class="activity-time">{{ relativeTime(entry.timestamp) }}</span>
              </div>
            }
          }
        </div>
      </div>

    </div>
  `,
  styles: [`
    /* ── Wrapper ─────────────────────────────── */
    .dashboard-wrapper {
      padding: 1.75rem 2rem;
      display: flex; flex-direction: column; gap: 1.75rem;
      min-height: 100%;
      background: #f4f5fb;
    }

    /* ── Header ─────────────────────────────── */
    .dashboard-header {
      display: flex; align-items: center; justify-content: space-between;
    }
    .dashboard-title {
      font-size: 1.6rem; font-weight: 800; color: #1a1d2e;
      letter-spacing: -0.5px; margin: 0;
    }
    .dashboard-subtitle {
      font-size: 0.78rem; color: #8b90a7; margin-top: 2px; display: block;
    }
    .live-badge {
      display: flex; align-items: center; gap: 6px;
      background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.25);
      color: #16a34a; font-size: 0.73rem; font-weight: 700;
      padding: 5px 13px; border-radius: 20px; letter-spacing: 0.5px;
    }
    .live-dot {
      width: 7px; height: 7px; border-radius: 50%; background: #22c55e;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%,100% { opacity:1; transform:scale(1); }
      50%      { opacity:.45; transform:scale(.8); }
    }

    /* ── Stat Cards ──────────────────────────── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2,1fr);
      gap: 1rem;
    }
    @media (min-width:768px) { .stats-grid { grid-template-columns: repeat(4,1fr); } }

    .stat-card {
      position: relative; background: #fff; border-radius: 18px;
      padding: 1.3rem 1.25rem 1.15rem;
      display: flex; align-items: center; gap: 1rem; overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,.05), 0 6px 20px rgba(0,0,0,.04);
      transition: transform .2s ease, box-shadow .2s ease;
    }
    .stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,0,0,.1); }

    .stat-icon-wrap {
      width: 48px; height: 48px; border-radius: 13px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .stat-icon-wrap mat-icon { font-size: 22px; width: 22px; height: 22px; }

    .stat-indigo .stat-icon-wrap { background: rgba(99,102,241,.12); color: #6366f1; }
    .stat-red    .stat-icon-wrap { background: rgba(239,68,68,.12);  color: #ef4444; }
    .stat-green  .stat-icon-wrap { background: rgba(34,197,94,.12);  color: #22c55e; }
    .stat-blue   .stat-icon-wrap { background: rgba(59,130,246,.12); color: #3b82f6; }

    .stat-value {
      font-size: 1.8rem; font-weight: 800; color: #1a1d2e;
      line-height: 1; margin: 0 0 4px;
    }
    .stat-label {
      font-size: 0.68rem; font-weight: 600; color: #8b90a7;
      text-transform: uppercase; letter-spacing: .7px; margin: 0;
    }
    .stat-glow {
      position: absolute; right: -24px; bottom: -24px;
      width: 88px; height: 88px; border-radius: 50%; opacity: .08;
    }
    .stat-glow-indigo { background: #6366f1; }
    .stat-glow-red    { background: #ef4444; }
    .stat-glow-green  { background: #22c55e; }
    .stat-glow-blue   { background: #3b82f6; }

    /* ── Period Toggle ───────────────────────── */
    .period-row { display: flex; align-items: center; gap: .75rem; }
    .period-label {
      font-size: .75rem; font-weight: 700; color: #8b90a7;
      text-transform: uppercase; letter-spacing: .5px;
    }
    .period-toggle {
      display: flex; background: #fff; border-radius: 10px;
      padding: 3px; border: 1px solid #e5e7f0;
      box-shadow: 0 1px 4px rgba(0,0,0,.05);
    }
    .toggle-btn {
      padding: 5px 18px; font-size: .8rem; font-weight: 600;
      border: none; background: transparent; border-radius: 7px;
      cursor: pointer; color: #8b90a7;
      transition: all .18s ease;
    }
    .toggle-btn.active {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: #fff;
      box-shadow: 0 3px 10px rgba(99,102,241,.4);
    }

    /* ── Chart Card Shell ────────────────────── */
    .charts-grid {
      display: grid; grid-template-columns: 1fr; gap: 1.25rem;
    }
    @media (min-width:768px) { .charts-grid { grid-template-columns: 1fr 1fr; } }

    .chart-card {
      background: #fff; border-radius: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,.05), 0 6px 22px rgba(0,0,0,.04);
      overflow: hidden;
    }
    .chart-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.25rem 1.4rem .85rem;
      border-bottom: 1px solid #f0f2fa;
    }
    .chart-title {
      font-size: .95rem; font-weight: 800; color: #1a1d2e; margin: 0 0 2px;
    }
    .chart-subtitle { font-size: .71rem; color: #8b90a7; margin: 0; }

    .chart-badge {
      width: 36px; height: 36px; border-radius: 11px;
      display: flex; align-items: center; justify-content: center;
    }
    .chart-badge mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .chart-badge-indigo { background: rgba(99,102,241,.12); color: #6366f1; }
    .chart-badge-green  { background: rgba(34,197,94,.12);  color: #22c55e; }
    .chart-badge-blue   { background: rgba(59,130,246,.12); color: #3b82f6; }

    .chart-body { padding: 1.1rem 1.25rem 1rem; }
    .chart-loading {
      display: flex; justify-content: center; align-items: center; height: 180px;
    }
    .spinner-ring {
      width: 38px; height: 38px; border-radius: 50%;
      border: 3px solid transparent; border-top-color: currentColor;
      animation: spin .75s linear infinite;
    }
    .spinner-indigo { color: #6366f1; }
    .spinner-green  { color: #22c55e; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .chart-empty {
      text-align: center; color: #b0b5c9; font-size: .85rem;
      padding: 3rem 0; margin: 0;
    }

    /* ── Equipment Rank List ─────────────────── */
    .rank-list {
      display: flex; flex-direction: column; gap: 0;
      padding: .6rem 0 .75rem;
    }
    .rank-row {
      display: flex; align-items: center; gap: .75rem;
      padding: .55rem 1.4rem;
      transition: background .12s;
    }
    .rank-row:hover { background: #f8f9fd; }

    .rank-num {
      width: 22px; height: 22px; border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      font-size: .65rem; font-weight: 800; flex-shrink: 0;
      background: #f0f1f8; color: #8b90a7;
    }
    .rank-1 { background: linear-gradient(135deg,#f59e0b,#fbbf24); color:#fff; box-shadow:0 2px 8px rgba(245,158,11,.4); }
    .rank-2 { background: linear-gradient(135deg,#94a3b8,#cbd5e1); color:#fff; box-shadow:0 2px 6px rgba(148,163,184,.4); }
    .rank-3 { background: linear-gradient(135deg,#b45309,#d97706); color:#fff; box-shadow:0 2px 6px rgba(180,83,9,.3); }

    .rank-name {
      font-size: .78rem; font-weight: 600; color: #374151;
      width: 130px; flex-shrink: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .rank-bar-wrap {
      flex: 1; height: 8px; background: #f0f2fa;
      border-radius: 99px; overflow: hidden;
    }
    .rank-bar {
      height: 100%; border-radius: 99px;
      background: linear-gradient(90deg, #6366f1 0%, #a78bfa 100%);
      transition: width .6s cubic-bezier(.4,0,.2,1);
      box-shadow: 0 0 6px rgba(99,102,241,.4);
    }
    .rank-val {
      font-size: .75rem; font-weight: 700; color: #6366f1;
      width: 28px; text-align: right; flex-shrink: 0;
    }

    /* ── Activity ────────────────────────────── */
    .activity-list { padding: .4rem 0; }
    .activity-item {
      display: flex; align-items: center; gap: .9rem;
      padding: .65rem 1.4rem;
      transition: background .12s;
    }
    .activity-item:hover { background: #f8f9fd; }
    .activity-icon-wrap {
      width: 34px; height: 34px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .activity-icon-wrap mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .activity-checkin  { background: rgba(34,197,94,.12); color: #16a34a; }
    .activity-checkout { background: rgba(148,163,184,.15); color: #64748b; }
    .activity-text {
      flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0;
    }
    .activity-name { font-size: .82rem; font-weight: 700; color: #1a1d2e; }
    .activity-desc {
      font-size: .73rem; color: #8b90a7;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .activity-time { font-size: .71rem; color: #b0b5c9; font-weight: 500; flex-shrink: 0; }
  `]
})
export class DashboardHomeComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);

  snapshot: LiveSnapshot | null = null;
  period: 'week' | 'month' = 'week';
  chartsLoading = true;
  activityLog: ActivityLogEntry[] = [];

  // Processed for the custom rank list
  usageTopItems: { name: string; count: number; pct: number }[] = [];

  usageChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  peakHoursChartData: ChartData<'bar'> = { labels: [], datasets: [] };

  usageChartOptions: ChartOptions<'bar'> = {
  indexAxis: 'y',
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(26,29,46,0.92)',
      padding: 10,
      titleFont: { size: 12, weight: 'bold' },
      bodyFont: { size: 12 },
      cornerRadius: 8,
      displayColors: false,
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: 'rgba(0,0,0,0.04)', drawTicks: false },
      border: { display: false },
      ticks: { color: '#8b90a7', font: { size: 11 }, padding: 6 },
    },
    y: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: '#4b5169', font: { size: 11, weight: 600 }, padding: 8 },
    },
  },
  animation: { duration: 700, easing: 'easeOutQuart' },

 
  elements: {
    bar: {
      borderRadius: 10,
      borderSkipped: false,
    },
  },
};

  peakHoursChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(26,29,46,0.92)',
      padding: 10,
      titleFont: { size: 12, weight: 'bold' },
      bodyFont: { size: 12 },
      cornerRadius: 8,
      displayColors: false,
      callbacks: {
        title: (items) => `${items[0].label}`,
        label: (item) => ` ${item.raw} sessions`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(0,0,0,0.04)', drawTicks: false },
      border: { display: false },
      ticks: { color: '#8b90a7', font: { size: 11 }, padding: 6 },
    },
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: '#8b90a7', font: { size: 10 }, maxRotation: 0, padding: 6 },
    },
  },
  animation: { duration: 700, easing: 'easeOutQuart' },

  // ✅ FIXED HERE
  elements: {
    bar: {
      borderRadius: 5,
      borderSkipped: false,
    },
  },
};

  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    interval(30000)
      .pipe(startWith(0), takeUntilDestroyed(this.destroyRef), switchMap(() => this.analyticsService.getLiveSnapshot()))
      .subscribe((snap) => (this.snapshot = snap));

    this.analyticsService.getActivityLog(0, 10)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((log) => (this.activityLog = log));

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
    const maxCount = Math.max(...top10.map(m => m.sessionCount), 1);

    // Power the custom HTML rank list
    this.usageTopItems = top10.map(m => ({
      name: m.machineName,
      count: m.sessionCount,
      pct: Math.round((m.sessionCount / maxCount) * 100),
    }));

    // Keep chart data in sync (used for tooltip fallback)
    this.usageChartData = {
      labels: top10.map(m => m.machineName),
  datasets: [{
    data: top10.map(m => m.sessionCount),
    backgroundColor: 'rgba(99,102,241,0.7)',
    borderWidth: 0,

    // 🔥 THICKER BARS
    barThickness: 20,
    maxBarThickness: 24,
    categoryPercentage: 0.9,
    barPercentage: 0.95,
      }],
    };
  }

  private buildPeakHoursChart(peaks: PeakHours): void {
    const all24 = Array.from({ length: 24 }, (_, h) => {
      const found = peaks.peakHours.find(p => p.hour === h);
      return { hour: h, count: found?.count ?? 0 };
    });

    this.peakHoursChartData = {
      labels: all24.map(h => this.formatHour(h.hour)),
  datasets: [{
    data: all24.map(h => h.count),
    backgroundColor: 'rgba(34,197,94,0.7)',
    borderWidth: 0,

    // 🔥 THICKER BARS
    barThickness: 14,
    maxBarThickness: 18,
    categoryPercentage: 0.85,
    barPercentage: 0.9,
      }],
    };
  }

  private formatHour(h: number): string {
    if (h === 0) return '12a';
    if (h === 12) return '12p';
    if (h % 3 !== 0) return '';
    return h < 12 ? `${h}a` : `${h - 12}p`;
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