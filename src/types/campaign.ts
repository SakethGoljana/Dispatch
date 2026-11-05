/**
 * Campaign & Recipient State Types
 * Strictly distinguishes observable client-side outcomes (Method A)
 * from server-verified delivery states (Method B).
 */

export type MessagingMethod = 'link_mode' | 'api_mode';

export type RecipientStatus =
  | 'PENDING'
  | 'SKIPPED'
  | 'INVALID_PHONE'
  | 'MISSING_DATA'
  // Method A (Observed locally)
  | 'LINK_OPENED'
  | 'CONFIRMED_SENT_BY_USER'
  // Method B (Server webhook verified)
  | 'QUEUED'
  | 'API_SENT'
  | 'API_DELIVERED'
  | 'API_READ'
  | 'API_FAILED';

export interface CampaignRecipient {
  id: string;
  studentId: string;
  studentName: string;
  parentPhone: string;
  renderedMessage: string;
  status: RecipientStatus;
  statusTimestamp?: string;
  errorMessage?: string;
}

export type CampaignStatus =
  | 'DRAFT'
  | 'READY'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'COMPLETED_WITH_ERRORS'
  | 'CANCELLED';

export interface Campaign {
  id: string;
  title: string;
  templateId: string;
  method: MessagingMethod;
  status: CampaignStatus;
  totalRecipients: number;
  processedCount: number;
  createdAt: string;
  completedAt?: string;
}
