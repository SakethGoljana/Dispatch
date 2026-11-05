import crypto from 'crypto';
import { Request, Response } from 'express';
import { MetaCloudApiAdapter } from '../src/adapters/metaCloudApiAdapter';
import { MockWhatsAppApiAdapter } from '../src/adapters/mockWhatsAppAdapter';
import { verifyWebhookChallenge, handleWebhookEvent } from '../src/controllers/webhookController';
import { dispatchCampaignBatch } from '../src/services/campaignDispatcher';
import { Campaign } from '../src/models/Campaign';
import { AuditLog } from '../src/models/AuditLog';
import { setWhatsAppAdapter } from '../src/adapters';

describe('Meta Cloud API Adapter & HMAC Verification', () => {
  const testSecret = 'secret_test_key_12345';
  const adapter = new MetaCloudApiAdapter({
    apiToken: 'test_token',
    phoneNumberId: '10987654321',
    appSecret: testSecret,
  });

  it('correctly reports configuration status', () => {
    expect(adapter.isConfigured()).toBe(true);
    const unconfigured = new MetaCloudApiAdapter({});
    expect(unconfigured.isConfigured()).toBe(false);
  });

  it('validates authentic HMAC SHA-256 signatures from Meta', () => {
    const rawBody = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
    const signature = crypto
      .createHmac('sha256', testSecret)
      .update(rawBody)
      .digest('hex');

    const isValid = adapter.verifyWebhookSignature(rawBody, `sha256=${signature}`);
    expect(isValid).toBe(true);
  });

  it('rejects tampered or forged HMAC signatures', () => {
    const rawBody = JSON.stringify({ object: 'whatsapp_business_account' });
    const forgedSignature = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

    const isValid = adapter.verifyWebhookSignature(rawBody, forgedSignature);
    expect(isValid).toBe(false);
  });

  it('rejects headers missing the sha256 prefix', () => {
    const rawBody = '{}';
    expect(adapter.verifyWebhookSignature(rawBody, 'md5=invalid')).toBe(false);
  });
});

describe('Mock WhatsApp Adapter (Safety & Explicit Identification)', () => {
  it('explicitly labels itself as mock_test_adapter and never live Meta', () => {
    const mockAdapter = new MockWhatsAppApiAdapter();
    expect(mockAdapter.adapterType).toBe('mock_test_adapter');
    expect(mockAdapter.isConfigured()).toBe(true);
  });

  it('simulates message sending with realistic wamid format', async () => {
    const mockAdapter = new MockWhatsAppApiAdapter();
    const res = await mockAdapter.sendMessage({
      to: '+919876543210',
      bodyText: 'Hello test parent',
    });

    expect(res.status).toBe('API_SENT');
    expect(res.providerMessageId).toContain('wamid.mock_');
  });

  it('simulates recipient delivery failures for specified numbers', async () => {
    const mockAdapter = new MockWhatsAppApiAdapter();
    mockAdapter.simulatedFailures.add('919999999999');

    const res = await mockAdapter.sendMessage({
      to: '+91 99999 99999',
      bodyText: 'Test failed delivery',
    });

    expect(res.status).toBe('API_FAILED');
    expect(res.error).toContain('Simulated failure');
  });
});

describe('Webhook Controller Endpoints', () => {
  describe('GET /api/webhooks/whatsapp (Meta Hub Challenge)', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'test_webhook_token';
      mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
    });

    it('returns the challenge code when verify token matches', () => {
      mockReq = {
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'test_webhook_token',
          'hub.challenge': '1155992288',
        },
      };

      verifyWebhookChallenge(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith('1155992288');
    });

    it('rejects challenge with 403 when verify token does not match', () => {
      mockReq = {
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': '1155992288',
        },
      };

      verifyWebhookChallenge(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Verification token mismatch' });
    });
  });

  describe('POST /api/webhooks/whatsapp (Status Ingestion)', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      setWhatsAppAdapter(new MockWhatsAppApiAdapter());
    });

    it('rejects requests with invalid HMAC signatures', async () => {
      mockReq = {
        headers: { 'x-hub-signature-256': 'sha256=invalid_signature' },
        body: {},
      };

      await handleWebhookEvent(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid HMAC signature' });
    });

    it('ingests delivered and read statuses and updates campaign recipient', async () => {
      const mockCampaignDoc: any = {
        recipients: [
          {
            parentPhone: '+919876543210',
            providerMessageId: 'wamid.HBgLMTIzNDU2Nzg5MA==',
            status: 'API_SENT',
            statusTimestamp: new Date(),
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Campaign, 'findOne').mockResolvedValue(mockCampaignDoc);

      mockReq = {
        headers: {},
        body: {
          entry: [
            {
              changes: [
                {
                  field: 'messages',
                  value: {
                    statuses: [
                      {
                        id: 'wamid.HBgLMTIzNDU2Nzg5MA==',
                        status: 'delivered',
                        timestamp: '1741584000',
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      };

      await handleWebhookEvent(mockReq as Request, mockRes as Response);

      expect(mockCampaignDoc.recipients[0].status).toBe('API_DELIVERED');
      expect(mockCampaignDoc.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({ received: true });
    });
  });
});

describe('Campaign Dispatcher (Method B & Duplicate-Send Prevention)', () => {
  beforeEach(() => {
    setWhatsAppAdapter(new MockWhatsAppApiAdapter());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('dispatches unsent recipients and never re-sends already confirmed/delivered messages', async () => {
    const mockCampaignDoc: any = {
      _id: 'camp_batch_123',
      schoolId: 'school_01',
      totalCount: 3,
      confirmedSentCount: 0,
      skippedCount: 0,
      status: 'DRAFT',
      recipients: [
        {
          studentName: 'Aarav Sharma',
          parentPhone: '+919876543210',
          renderedMessage: 'Dear Parent, fee balance is ₹5,000.',
          status: 'PENDING',
        },
        {
          studentName: 'Priya Patel',
          parentPhone: '+919876543211',
          renderedMessage: 'Dear Parent, fee balance is ₹3,000.',
          status: 'CONFIRMED_SENT_BY_USER', // Method A already sent this!
        },
        {
          studentName: 'Rohan Gupta',
          parentPhone: '+919876543212',
          renderedMessage: 'Dear Parent, fee balance is ₹4,500.',
          status: 'API_DELIVERED', // Already delivered!
        },
      ],
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Campaign, 'findOne').mockResolvedValue(mockCampaignDoc);
    jest.spyOn(AuditLog, 'create').mockResolvedValue({} as any);

    // FIRST DISPATCH:
    const summary1 = await dispatchCampaignBatch('camp_batch_123', 'school_01', 'user_01');

    expect(summary1.totalRecipients).toBe(3);
    expect(summary1.newlySent).toBe(1); // Only Aarav was unsent
    expect(summary1.previouslySentSkipped).toBe(2); // Priya & Rohan skipped!
    expect(mockCampaignDoc.recipients[0].status).toBe('API_SENT');
    expect(mockCampaignDoc.recipients[0].providerMessageId).toBeDefined();

    // SECOND DISPATCH (Idempotency / Accidental retry):
    const summary2 = await dispatchCampaignBatch('camp_batch_123', 'school_01', 'user_01');

    expect(summary2.newlySent).toBe(0); // ZERO duplicates sent
    expect(summary2.previouslySentSkipped).toBe(3); // All 3 now skipped
    expect(summary2.failed).toBe(0);
  });
});
