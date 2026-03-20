export interface LiveSnapshot {
  activeUsers: number;
  equipmentInUse: number;
  totalEquipment: number;
  utilizationRate: number;
}

export interface UsageStats {
  period: 'week' | 'month';
  equipmentUsage: { equipmentId: number; name: string; usageCount: number }[];
}

export interface PeakHours {
  period: 'week' | 'month';
  hourlyData: { hour: number; count: number }[];
}

export interface UserAnalytics {
  period: 'week' | 'month';
  newUsers: number;
  activeUsers: number;
  totalUsers: number;
}

export interface ActivityLogEntry {
  id: number;
  userId: number;
  username: string;
  equipmentId: number;
  equipmentName: string;
  action: 'CHECK_IN' | 'CHECK_OUT';
  timestamp: string;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
