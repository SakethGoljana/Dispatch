/**
 * Client-Side Meta WhatsApp Cloud API Service
 * Self-service direct communication with Meta Graph API v21.0.
 * Persists school credentials locally on device.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const META_CREDS_STORAGE_KEY = '@schoolping_meta_credentials_v1';

export interface MetaCredentials {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId?: string;
  verifiedName?: string;
  verifiedNumber?: string;
}

export async function getStoredMetaCredentials(): Promise<MetaCredentials | null> {
  try {
    const raw = await AsyncStorage.getItem(META_CREDS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveStoredMetaCredentials(creds: MetaCredentials): Promise<void> {
  try {
    await AsyncStorage.setItem(META_CREDS_STORAGE_KEY, JSON.stringify(creds));
  } catch (err) {
    console.warn('Failed to store Meta credentials', err);
  }
}

export async function clearStoredMetaCredentials(): Promise<void> {
  try {
    await AsyncStorage.removeItem(META_CREDS_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear Meta credentials', err);
  }
}

export interface MetaConnectionTestResult {
  success: boolean;
  verifiedName?: string;
  displayNumber?: string;
  error?: string;
}

/**
 * Pings Meta Graph API to verify Phone Number ID and Access Token validity
 */
export async function testMetaConnection(
  phoneNumberId: string,
  accessToken: string
): Promise<MetaConnectionTestResult> {
  const cleanPhoneId = phoneNumberId.trim();
  const cleanToken = accessToken.trim();

  if (cleanPhoneId.toUpperCase().includes('SANDBOX')) {
    return {
      success: true,
      verifiedName: 'SchoolPing Meta Cloud Sandbox',
      displayNumber: '+91 90594 78739 (Test Mode)',
    };
  }

  if (!cleanPhoneId || !cleanToken) {
    return { success: false, error: 'Phone Number ID and Access Token are required.' };
  }

  try {
    const url = `https://graph.facebook.com/v21.0/${cleanPhoneId}?fields=verified_name,display_phone_number,quality_rating`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || `Meta API error (${response.status})`,
      };
    }

    return {
      success: true,
      verifiedName: data.verified_name || 'Verified School Account',
      displayNumber: data.display_phone_number || cleanPhoneId,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error: could not connect to Meta Graph API.',
    };
  }
}

export interface MetaSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sends a single text message through Meta WhatsApp Cloud API directly
 */
export async function sendMetaTextMessage(
  phoneNumberId: string,
  accessToken: string,
  toPhone: string,
  messageText: string
): Promise<MetaSendResult> {
  const cleanPhoneId = phoneNumberId.trim();
  const cleanToken = accessToken.trim();

  if (cleanPhoneId.toUpperCase().includes('SANDBOX')) {
    await new Promise((resolve) => setTimeout(resolve, 80));
    return {
      success: true,
      messageId: `wamid.HBgM${Date.now()}_sandbox`,
    };
  }

  let cleanTo = toPhone.replace(/\D/g, '');
  if (cleanTo.length === 10) {
    cleanTo = `91${cleanTo}`;
  }

  const url = `https://graph.facebook.com/v21.0/${cleanPhoneId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanTo,
    type: 'text',
    text: {
      body: messageText,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const errDetail =
        data.error?.error_user_msg ||
        data.error?.message ||
        `Meta HTTP Error ${response.status}`;
      return {
        success: false,
        error: errDetail,
      };
    }

    const messageId = data.messages?.[0]?.id || `wamid.HBgM${Date.now()}`;
    return {
      success: true,
      messageId,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network timeout or unreachable Meta endpoint.',
    };
  }
}
