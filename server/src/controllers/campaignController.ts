import { Request, Response } from 'express';
import { Campaign } from '../models/Campaign';
import { AuditLog } from '../models/AuditLog';

export async function listCampaigns(req: Request, res: Response): Promise<void> {
  try {
    const schoolId = req.user!.schoolId;
    const campaigns = await Campaign.find({ schoolId })
      .select('-recipients.renderedMessage') // Omit full rendered messages from summary list for privacy
      .sort({ createdAt: -1 });

    res.json({ campaigns });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch campaigns.' });
  }
}

export async function createCampaign(req: Request, res: Response): Promise<void> {
  try {
    const { title, templateId, method, recipients } = req.body;
    const schoolId = req.user!.schoolId;
    const userId = req.user!.userId;

    if (!title || !Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({ error: 'Title and recipients array are required.' });
      return;
    }

    const campaign = await Campaign.create({
      schoolId,
      createdBy: userId,
      title,
      templateId,
      method: method || 'link_mode',
      status: 'IN_PROGRESS',
      totalCount: recipients.length,
      confirmedSentCount: 0,
      skippedCount: 0,
      recipients: recipients.map((r: any) => ({
        studentId: r.studentId,
        studentName: r.studentName,
        parentPhone: r.parentPhone,
        outstandingBalance: r.outstandingBalance,
        renderedMessage: r.renderedMessage,
        status: 'PENDING',
      })),
    });

    await AuditLog.create({
      schoolId,
      userId,
      action: 'CAMPAIGN_CREATED',
      resourceType: 'Campaign',
      resourceId: String(campaign._id),
      details: {
        title: campaign.title,
        recipientCount: campaign.totalCount,
        method: campaign.method,
      },
    });

    res.status(201).json({ campaign });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to create campaign.' });
  }
}

export async function getCampaignById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;

    const campaign = await Campaign.findOne({ _id: id, schoolId });
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found or does not belong to your school.' });
      return;
    }

    res.json({ campaign });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch campaign.' });
  }
}

export async function updateRecipientOutcome(req: Request, res: Response): Promise<void> {
  try {
    const { id, studentId } = req.params;
    const { status } = req.body;
    const schoolId = req.user!.schoolId;

    if (!['CONFIRMED_SENT_BY_USER', 'SKIPPED'].includes(status)) {
      res.status(400).json({ error: 'Invalid status update for Link Mode.' });
      return;
    }

    const campaign = await Campaign.findOne({ _id: id, schoolId });
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found.' });
      return;
    }

    const recipient = campaign.recipients.find((r) => r.studentId === studentId);
    if (!recipient) {
      res.status(404).json({ error: 'Recipient not found in this campaign.' });
      return;
    }

    recipient.status = status;
    recipient.statusTimestamp = new Date();

    // Recalculate tallies
    campaign.confirmedSentCount = campaign.recipients.filter(
      (r) => r.status === 'CONFIRMED_SENT_BY_USER'
    ).length;

    campaign.skippedCount = campaign.recipients.filter(
      (r) => r.status === 'SKIPPED'
    ).length;

    if (campaign.confirmedSentCount + campaign.skippedCount >= campaign.totalCount) {
      campaign.status = 'COMPLETED';
      campaign.completedAt = new Date();
    }

    await campaign.save();

    res.json({
      message: 'Outcome recorded.',
      confirmedSentCount: campaign.confirmedSentCount,
      skippedCount: campaign.skippedCount,
      campaignStatus: campaign.status,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update recipient outcome.' });
  }
}

export async function dispatchCampaignHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const schoolId = req.user!.schoolId;
    const userId = req.user!.userId;

    const { dispatchCampaignBatch } = await import('../services/campaignDispatcher');
    const summary = await dispatchCampaignBatch(id, schoolId, userId);

    res.json({
      message: 'Campaign dispatched successfully.',
      summary,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to dispatch campaign.' });
  }
}

