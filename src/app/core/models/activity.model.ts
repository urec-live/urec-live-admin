export interface ActivityLogEntry {
  id: number;
  eventType: string;
  username: string;
  description: string;
  equipmentName: string | null;
  timestamp: string;
}

export interface ActivitySummary {
  checkInsToday: number;
  checkOutsToday: number;
  sessionsToday: number;
  registrationsToday: number;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}