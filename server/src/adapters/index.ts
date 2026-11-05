import { IWhatsAppApiAdapter } from './whatsappAdapterInterface';
import { MetaCloudApiAdapter } from './metaCloudApiAdapter';
import { MockWhatsAppApiAdapter } from './mockWhatsAppAdapter';

export * from './whatsappAdapterInterface';
export * from './metaCloudApiAdapter';
export * from './mockWhatsAppAdapter';

let adapterInstance: IWhatsAppApiAdapter | null = null;

export function getWhatsAppAdapter(): IWhatsAppApiAdapter {
  if (adapterInstance) return adapterInstance;

  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (token && phoneId) {
    console.log('[SchoolPing WhatsApp] Active Adapter: Meta WhatsApp Cloud API (Live)');
    adapterInstance = new MetaCloudApiAdapter({
      apiToken: token,
      phoneNumberId: phoneId,
      appSecret,
    });
  } else {
    console.log('[SchoolPing WhatsApp] Active Adapter: Mock Test Adapter (Meta credentials not set)');
    adapterInstance = new MockWhatsAppApiAdapter();
  }

  return adapterInstance;
}

export function setWhatsAppAdapter(customAdapter: IWhatsAppApiAdapter): void {
  adapterInstance = customAdapter;
}
