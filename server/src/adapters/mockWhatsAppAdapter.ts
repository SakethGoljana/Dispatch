/**
 * Mock WhatsApp API Adapter
 * CLEARLY LABELED TEST ADAPTER.
 * Used for automated tests and development when real Meta Business credentials are not configured.
 * Never claims to be a live Meta integration.
 */

import { IWhatsAppApiAdapter, WhatsAppMessagePayload, WhatsAppSendResult } from './whatsappAdapterInterface';

export class MockWhatsAppApiAdapter implements IWhatsAppApiAdapter {
  readonly adapterType = 'mock_test_adapter' as const;
  public simulatedFailures = new Set<string>(); // Set of phone numbers to simulate failure for

  isConfigured(): boolean {
    return true; // Always ready for simulated testing
  }

  async sendMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppSendResult> {
    const cleanTo = payload.to.replace(/\D/g, '');

    // Simulate failures for test cases
    if (this.simulatedFailures.has(cleanTo)) {
      return {
        providerMessageId: `wamid.mock_failed_${Date.now()}`,
        status: 'API_FAILED',
        error: 'Simulated failure: Recipient phone number not registered on WhatsApp',
        timestamp: new Date(),
      };
    }

    const mockId = `wamid.mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return {
      providerMessageId: mockId,
      status: 'API_SENT',
      timestamp: new Date(),
      rawResponse: { simulated: true, mockId, to: cleanTo },
    };
  }

  verifyWebhookSignature(_rawBody: string, signatureHeader?: string): boolean {
    if (signatureHeader === 'sha256=invalid_signature') return false;
    return true;
  }
}
