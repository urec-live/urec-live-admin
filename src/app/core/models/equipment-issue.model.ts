export type IssueSeverity = 'OUT_OF_ORDER' | 'DAMAGED';
export type IssueStatus = 'REPORTED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED';

export interface EquipmentIssueReport {
  id: number;
  equipmentId: number;
  equipmentName: string;
  equipmentCode: string | null;
  severity: IssueSeverity;
  description: string;
  status: IssueStatus;
  reporterUsername: string;
  reportedAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

/** One machine on the Equipment Issues page with its reports (newest first). */
export interface EquipmentIssueGroup {
  equipmentId: number;
  equipmentName: string;
  equipmentCode: string | null;
  openReportCount: number;
  worstSeverity: IssueSeverity | null; // across open reports; null when all are resolved
  latestReportedAt: string;
  reports: EquipmentIssueReport[];
}

export interface EquipmentIssueSummary {
  reported: number;
  acknowledged: number;
  inProgress: number;
  affectedMachines: number;
}

/** Statuses in the order staff move a report along. */
export const ISSUE_STATUSES: IssueStatus[] = ['REPORTED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED'];

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  REPORTED: 'New',
  ACKNOWLEDGED: 'Acknowledged',
  IN_PROGRESS: 'Repairing',
  RESOLVED: 'Resolved',
};

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  OUT_OF_ORDER: 'Not working',
  DAMAGED: 'Damaged',
};
