/**
 * Campaign Dispatcher Service (Method B Processing)
 * Sends eligible recipients through WhatsApp API adapter, enforces duplicate-send protection,
 * and maintains atomic status tracking.
 */

import { Campaign, ICampaign } from '../models/Campaign';
import { getWhatsAppAdapter } from '../adapters';
import { AuditLog } from '../models/AuditLog';
import { maskPhoneNumber } from '../utils/maskData';

export interface DispatchSummary {
  campaignId: string;
  totalRecipients: number;
  newlySent: number;
  previouslySentSkipped: number;
  failed: number;
  adapterUsed: string;
}

export async function dispatchCampaignBatch(
  campaignId: string,
  schoolId: string,
  userId: string
): Promise<DispatchSummary> {
  const campaign = await Campaign.findOne({ _id: campaignId, schoolId });
  if (!campaign) {
    throw new Error('Campaign not found or outside school boundary.');
  }

  const adapter = getWhatsAppAdapter();
  let newlySent = 0;
  let previouslySentSkipped = 0;
  let failed = 0;

  for (const recipient of campaign.recipients) {
    // DUPLICATE-SEND PREVENTION:
    // If recipient is already confirmed sent or delivered, NEVER send again!
    if (
      recipient.status === 'CONFIRMED_SENT_BY_USER' ||
      recipient.status === 'API_SENT' ||
      recipient.status === 'API_DELIVERED' ||
      recipient.status === 'API_READ'
    ) {
      previouslySentSkipped++;
      continue;
    }

    try {
      const result = await adapter.sendMessage({
        to: recipient.parentPhone,
        bodyText: recipient.renderedMessage,
      });

      recipient.status = result.status;
      recipient.statusTimestamp = result.timestamp;
      (recipient as any).providerMessageId = result.providerMessageId;

      if (result.status === 'API_SENT') {
        newlySent++;
      } else {
        failed++;
        recipient.notes = result.error;
      }
    } catch (err: any) {
      recipient.status = 'API_FAILED';
      recipient.notes = err?.message || 'Dispatch failure';
      failed++;
    }
  }

  // Recalculate campaign tallies
  campaign.confirmedSentCount = campaign.recipients.filter(
    (r) =>
      r.status === 'CONFIRMED_SENT_BY_USER' ||
      r.status === 'API_SENT' ||
      r.status === 'API_DELIVERED' ||
      r.status === 'API_READ'
  ).length;

  campaign.skippedCount = campaign.recipients.filter((r) => r.status === 'SKIPPED').length;

  const totalProcessed = campaign.confirmedSentCount + campaign.skippedCount;
  if (totalProcessed >= campaign.totalCount) {
    campaign.status = 'COMPLETED';
    campaign.completedAt = new Date();
  } else {
    campaign.status = 'IN_PROGRESS';
  }

  await campaign.save();

  await AuditLog.create({
    schoolId,
    userId,
    action: 'CAMPAIGN_DISPATCHED_API',
    resourceType: 'Campaign',
    resourceId: String(campaign._id),
    details: {
      newlySent,
      previouslySentSkipped,
      failed,
      adapter: adapter.adapterType,
    },
  });

  return {
    campaignId: String(campaign._id),
    totalRecipients: campaign.totalCount,
    newlySent,
    previouslySentSkipped,
    failed,
    adapterUsed: adapter.adapterType,
  };
}
