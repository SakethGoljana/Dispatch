/**
 * WhatsApp Link Mode Adapter (Method A)
 * Handles phone normalization for WhatsApp click-to-chat, robust URI encoding,
 * intent invocation with web fallback, and status tracking.
 */

import { Linking } from 'react-native';

export interface WhatsAppLinkPayload {
  cleanPhone: string;
  encodedText: string;
  nativeUri: string;
  webUrl: string;
}

export interface WhatsAppLaunchResult {
  opened: boolean;
  methodUsed: 'native_intent' | 'web_fallback' | 'failed';
  error?: string;
}

/**
 * Normalizes phone numbers into clean digits with country code for WhatsApp URLs.
 * WhatsApp wa.me / intent requires country code without '+' or special characters.
 * Example: "+91 98765-43210" -> "919876543210"
 */
export function cleanPhoneNumberForWhatsApp(
  rawPhone: string,
  defaultCountryCode = '91'
): string {
  const digitsOnly = String(rawPhone).replace(/\D/g, '');
  const cleanDefaultCode = defaultCountryCode.replace(/\D/g, '');

  if (digitsOnly.length === 10) {
    return `${cleanDefaultCode}${digitsOnly}`;
  }

  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return `${cleanDefaultCode}${digitsOnly.slice(1)}`;
  }

  return digitsOnly;
}

/**
 * Generates correctly encoded WhatsApp URIs for Android native intent and web fallback.
 */
export function generateWhatsAppLink(
  rawPhone: string,
  messageText: string,
  defaultCountryCode = '91'
): WhatsAppLinkPayload {
  const cleanPhone = cleanPhoneNumberForWhatsApp(rawPhone, defaultCountryCode);
  const encodedText = encodeURIComponent(messageText);

  const nativeUri = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
  const webUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  return {
    cleanPhone,
    encodedText,
    nativeUri,
    webUrl,
  };
}

/**
 * Launches the personalized chat directly in WhatsApp on the device.
 * Tries Android native intent first, falling back to web wa.me if necessary.
 */
export async function launchWhatsAppChat(
  rawPhone: string,
  messageText: string,
  defaultCountryCode = '91'
): Promise<WhatsAppLaunchResult> {
  const { nativeUri, webUrl, cleanPhone } = generateWhatsAppLink(
    rawPhone,
    messageText,
    defaultCountryCode
  );

  if (!cleanPhone || cleanPhone.length < 10) {
    return {
      opened: false,
      methodUsed: 'failed',
      error: 'Invalid phone number length for WhatsApp chat',
    };
  }

  try {
    const canOpenNative = await Linking.canOpenURL(nativeUri).catch(() => false);

    if (canOpenNative) {
      await Linking.openURL(nativeUri);
      return { opened: true, methodUsed: 'native_intent' };
    }

    // Fallback to web wa.me
    const canOpenWeb = await Linking.canOpenURL(webUrl).catch(() => false);
    if (canOpenWeb) {
      await Linking.openURL(webUrl);
      return { opened: true, methodUsed: 'web_fallback' };
    }

    return {
      opened: false,
      methodUsed: 'failed',
      error: 'Neither native WhatsApp app nor web browser could handle the link',
    };
  } catch (err: any) {
    return {
      opened: false,
      methodUsed: 'failed',
      error: err?.message || 'Error opening WhatsApp link',
    };
  }
}
