export interface LiveSnapshot {
  totalMachines: number;
  occupiedMachines: number;
  availableMachines: number;
  reservedMachines: number;
  activeUsers: number;
}

export interface MachineUsage {
  machineId: number;
  machineName: string;
  sessionCount: number;
  avgDurationSeconds: number;
}

export interface UsageStats {
  period: 'week' | 'month';
  totalSessions: number;
  mostUsed: MachineUsage[];
  leastUsed: MachineUsage[];
}

export interface HourlyCount {
  hour: number;
  count: number;
}

export interface PeakHours {
  period: 'week' | 'month';
  peakHours: HourlyCount[];
}

export interface UserAnalytics {
  period: 'week' | 'month';
  totalActiveUsers: number;
  totalNewRegistrations: number;
  dauByDate: Record<string, number>;
  newRegistrationsByDate: Record<string, number>;
}

export interface ActivityLogEntry {
  id: number;
  eventType: string;
  username: string;
  description: string;
  equipmentName: string;
  timestamp: string;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
