/**
 * WhatsApp Messaging Adapter Interface
 * Common contract for Meta Cloud API and clearly labeled test mock adapter.
 */

export interface WhatsAppMessagePayload {
  to: string; // E.164 phone number without + (e.g. "919876543210")
  templateName?: string;
  templateLanguage?: string;
  bodyText?: string;
  variables?: Record<string, string>;
}

export interface WhatsAppSendResult {
  providerMessageId: string;
  status: 'API_QUEUED' | 'API_SENT' | 'API_FAILED';
  error?: string;
  timestamp: Date;
  rawResponse?: any;
}

export interface IWhatsAppApiAdapter {
  readonly adapterType: 'meta_cloud_api' | 'mock_test_adapter';
  isConfigured(): boolean;
  sendMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppSendResult>;
  verifyWebhookSignature(rawBody: string, signatureHeader?: string): boolean;
}
