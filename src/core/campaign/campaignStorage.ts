/**
 * Local Campaign Storage & Outcome Recorder
 * Persists campaign progress and outcomes locally via AsyncStorage.
 * Strictly separates observed Link Mode user confirmations from verified delivery.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CAMPAIGNS_STORAGE_KEY = '@schoolping_campaigns_v1';

export type PersistentRecipientStatus =
  | 'PENDING'
  | 'LINK_OPENED'
  | 'CONFIRMED_SENT_BY_USER'
  | 'SKIPPED'
  | 'API_SENT'
  | 'API_DELIVERED'
  | 'API_READ'
  | 'API_FAILED';

export interface PersistentRecipient {
  studentId: string;
  studentName: string;
  parentPhone: string;
  balance?: number;
  renderedMessage: string;
  status: PersistentRecipientStatus;
  providerMessageId?: string;
  timestamp?: string;
}

export interface CampaignRecord {
  id: string;
  title: string;
  createdAt: string;
  completedAt?: string;
  totalCount: number;
  confirmedSentCount: number;
  skippedCount: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  method: 'link_mode' | 'official_api';
  recipients: PersistentRecipient[];
}

export async function getSavedCampaigns(): Promise<CampaignRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(CAMPAIGNS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveCampaignRecord(campaign: CampaignRecord): Promise<void> {
  try {
    const all = await getSavedCampaigns();
    const index = all.findIndex((c) => c.id === campaign.id);

    if (index >= 0) {
      all[index] = campaign;
    } else {
      all.unshift(campaign);
    }

    await AsyncStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.warn('Failed to save campaign record', err);
  }
}

export async function updateCampaignRecipientOutcome(
  campaignId: string,
  studentId: string,
  newStatus: 'CONFIRMED_SENT_BY_USER' | 'SKIPPED'
): Promise<CampaignRecord | undefined> {
  const all = await getSavedCampaigns();
  const campaign = all.find((c) => c.id === campaignId);
  if (!campaign) return undefined;

  const recipient = campaign.recipients.find((r) => r.studentId === studentId);
  if (recipient) {
    recipient.status = newStatus;
    recipient.timestamp = new Date().toISOString();
  }

  // Recalculate stats
  campaign.confirmedSentCount = campaign.recipients.filter(
    (r) => r.status === 'CONFIRMED_SENT_BY_USER'
  ).length;

  campaign.skippedCount = campaign.recipients.filter(
    (r) => r.status === 'SKIPPED'
  ).length;

  const processedCount = campaign.confirmedSentCount + campaign.skippedCount;
  if (processedCount >= campaign.totalCount) {
    campaign.status = 'COMPLETED';
    campaign.completedAt = new Date().toISOString();
  }

  await AsyncStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(all));
  return campaign;
}

export async function deleteCampaignRecord(campaignId: string): Promise<void> {
  const all = await getSavedCampaigns();
  const filtered = all.filter((c) => c.id !== campaignId);
  await AsyncStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(filtered));
}
