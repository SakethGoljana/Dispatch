/**
 * Official Meta WhatsApp Cloud API Adapter
 * Handles real HTTP communication with Meta Graph API endpoints.
 * Never exposes credentials to mobile clients.
 */

import crypto from 'crypto';
import { IWhatsAppApiAdapter, WhatsAppMessagePayload, WhatsAppSendResult } from './whatsappAdapterInterface';

export interface MetaCloudApiConfig {
  apiToken?: string;
  phoneNumberId?: string;
  appSecret?: string;
}

export class MetaCloudApiAdapter implements IWhatsAppApiAdapter {
  readonly adapterType = 'meta_cloud_api' as const;
  private apiToken?: string;
  private phoneNumberId?: string;
  private appSecret?: string;
  private graphApiVersion = 'v21.0';

  constructor(config: MetaCloudApiConfig) {
    this.apiToken = config.apiToken;
    this.phoneNumberId = config.phoneNumberId;
    this.appSecret = config.appSecret;
  }

  isConfigured(): boolean {
    return !!(this.apiToken && this.phoneNumberId);
  }

  async sendMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppSendResult> {
    if (!this.isConfigured()) {
      return {
        providerMessageId: '',
        status: 'API_FAILED',
        error: 'Meta Cloud API credentials are not configured on this server.',
        timestamp: new Date(),
      };
    }

    const cleanTo = payload.to.replace(/\D/g, '');
    const url = `https://graph.facebook.com/${this.graphApiVersion}/${this.phoneNumberId}/messages`;

    // Construct Meta message body
    const body: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
    };

    if (payload.templateName) {
      body.type = 'template';
      body.template = {
        name: payload.templateName,
        language: { code: payload.templateLanguage || 'en' },
      };
      if (payload.variables && Object.keys(payload.variables).length > 0) {
        body.template.components = [
          {
            type: 'body',
            parameters: Object.values(payload.variables).map((val) => ({
              type: 'text',
              text: String(val),
            })),
          },
        ];
      }
    } else {
      body.type = 'text';
      body.text = { body: payload.bodyText || '' };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data: any = await response.json();

      if (!response.ok || data.error) {
        return {
          providerMessageId: '',
          status: 'API_FAILED',
          error: data.error?.message || `Meta API Error (${response.status})`,
          rawResponse: data,
          timestamp: new Date(),
        };
      }

      const messageId = data.messages?.[0]?.id || `wamid.${Date.now()}`;

      return {
        providerMessageId: messageId,
        status: 'API_SENT',
        timestamp: new Date(),
        rawResponse: data,
      };
    } catch (err: any) {
      return {
        providerMessageId: '',
        status: 'API_FAILED',
        error: err?.message || 'Network failure connecting to Meta Graph API',
        timestamp: new Date(),
      };
    }
  }

  verifyWebhookSignature(rawBody: string, signatureHeader?: string): boolean {
    if (!this.appSecret || !signatureHeader) return true; // Signature check skipped if no app secret set

    const [scheme, signature] = signatureHeader.split('=');
    if (scheme !== 'sha256' || !signature) return false;

    const expectedHash = crypto
      .createHmac('sha256', this.appSecret)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHash));
  }
}
