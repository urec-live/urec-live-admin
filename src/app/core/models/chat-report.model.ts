/** Which chat a reported message is in. */
export type ChatChannel = 'COMMUNITY' | 'DM';

export type ChatReportReason = 'SPAM' | 'HARASSMENT' | 'INAPPROPRIATE' | 'OTHER';

/** OPEN until staff dismiss it (message stays up) or action it (message removed). */
export type ChatReportStatus = 'OPEN' | 'DISMISSED' | 'ACTIONED';

export type ChatMessageKind = 'TEXT' | 'GIF' | 'STICKER';

export const CHAT_REPORT_REASON_LABELS: Record<ChatReportReason, string> = {
  SPAM: 'Spam',
  HARASSMENT: 'Harassment or bullying',
  INAPPROPRIATE: 'Inappropriate content',
  OTHER: 'Something else',
};

export const CHAT_CHANNEL_LABELS: Record<ChatChannel, string> = {
  COMMUNITY: 'Community chat',
  DM: 'Direct message',
};

/** The URL segment the API uses for a channel. */
export function chatChannelPath(channel: ChatChannel): 'community' | 'dm' {
  return channel === 'DM' ? 'dm' : 'community';
}

export interface ChatReport {
  id: number;
  reporterUsername: string;
  reason: ChatReportReason;
  note: string | null;
  status: ChatReportStatus;
  reportedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface ChatReportMedia {
  url: string;
  previewUrl: string | null;
  width: number | null;
  height: number | null;
}

/** A reported message with all its reports. Content is shown even if the sender has deleted it. */
export interface ChatReportGroup {
  channel: ChatChannel;
  messageId: number;
  senderUsername: string | null;
  recipientUsername: string | null;
  content: string | null;
  kind: ChatMessageKind | null;
  media: ChatReportMedia | null;
  sentAt: string | null;
  deletedBySender: boolean | null;
  removedByStaff: boolean | null;
  /** False when the message itself can't be found any more. */
  messageAvailable: boolean;
  openCount: number;
  latestReportedAt: string | null;
  /** Newest first. */
  reports: ChatReport[];
}

export interface ChatReportSummary {
  /** Messages with at least one open report. */
  openMessages: number;
  openReports: number;
}
