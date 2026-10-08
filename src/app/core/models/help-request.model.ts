export type HelpRequestStatus =
  | 'REQUEST_RECEIVED'
  | 'ON_THE_WAY'
  | 'TOO_BUSY'
  | 'RESOLVED'
  | 'CANCELLED'
  | 'EXPIRED';

export type HelpRequestClosedBy = 'STAFF' | 'MEMBER' | 'SYSTEM';

/** The two statuses staff set from the dashboard; "Done helping" has its own endpoint. */
export type StaffResponse = 'ON_THE_WAY' | 'TOO_BUSY';

export interface HelpRequest {
  id: number;
  status: HelpRequestStatus;
  equipmentId: number;
  equipmentCode: string | null;
  equipmentName: string;
  floorLabel: string | null;
  exerciseName: string | null;
  memberUsername: string;
  staffUsername: string | null;
  createdAt: string; // ISO timestamps
  updatedAt: string;
  firstResponseAt: string | null;
  closedAt: string | null;
  closedBy: HelpRequestClosedBy | null;
}

export const HELP_STATUS_LABELS: Record<HelpRequestStatus, string> = {
  REQUEST_RECEIVED: 'Request received',
  ON_THE_WAY: 'On the way',
  TOO_BUSY: 'Too busy',
  RESOLVED: 'Helped',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

/** Open requests nobody is heading to yet: new ones and ones marked "Too busy". */
export function needsStaff(request: Pick<HelpRequest, 'status'>): boolean {
  return request.status === 'REQUEST_RECEIVED' || request.status === 'TOO_BUSY';
}

/** How a closed request ended, for the "Recently closed" list. */
export function outcomeLabel(request: Pick<HelpRequest, 'status' | 'closedBy'>): string {
  switch (request.status) {
    case 'RESOLVED':
      return request.closedBy === 'MEMBER' ? 'Member got help' : 'Done helping';
    case 'CANCELLED':
      return 'Cancelled by member';
    case 'EXPIRED':
      return 'Expired';
    default:
      return HELP_STATUS_LABELS[request.status];
  }
}
