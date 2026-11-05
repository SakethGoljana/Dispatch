import { Request, Response } from 'express';
import { getWhatsAppAdapter } from '../adapters';
import { Campaign } from '../models/Campaign';

export function verifyWebhookChallenge(req: Request, res: Response): void {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'schoolping_webhook_token_2026';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[SchoolPing Webhook] Meta challenge verification passed.');
    res.status(200).send(challenge);
    return;
  }

  res.status(403).json({ error: 'Verification token mismatch' });
}

export async function handleWebhookEvent(req: Request, res: Response): Promise<void> {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  const rawBody = JSON.stringify(req.body);
  const adapter = getWhatsAppAdapter();

  if (!adapter.verifyWebhookSignature(rawBody, signature)) {
    console.warn('[SchoolPing Webhook] Invalid webhook signature detected');
    res.status(401).json({ error: 'Invalid HMAC signature' });
    return;
  }

  const entries = req.body.entry || [];

  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      if (change.field === 'messages' && change.value?.statuses) {
        const statuses = change.value.statuses;

        for (const st of statuses) {
          const messageId = st.id;
          const statusText = st.status; // 'sent' | 'delivered' | 'read' | 'failed'

          // Map Meta status to SchoolPing status
          let mappedStatus: any = 'API_SENT';
          if (statusText === 'delivered') mappedStatus = 'API_DELIVERED';
          else if (statusText === 'read') mappedStatus = 'API_READ';
          else if (statusText === 'failed') mappedStatus = 'API_FAILED';

          // Locate recipient across active campaigns
          const campaign = await Campaign.findOne({
            'recipients.providerMessageId': messageId,
          });

          if (campaign) {
            const recipient = campaign.recipients.find(
              (r: any) => r.providerMessageId === messageId
            );

            if (recipient) {
              recipient.status = mappedStatus;
              recipient.statusTimestamp = new Date(parseInt(st.timestamp, 10) * 1000 || Date.now());

              if (st.errors && st.errors.length > 0) {
                recipient.notes = `Meta Error ${st.errors[0].code}: ${st.errors[0].title}`;
              }

              await campaign.save();
            }
          }
        }
      }
    }
  }

  // Meta expects an immediate 200 OK
  res.status(200).json({ received: true });
}
