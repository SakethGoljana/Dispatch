import {
  cleanPhoneNumberForWhatsApp,
  generateWhatsAppLink,
} from '../adapters/whatsappLink';

describe('WhatsApp Link Mode Phone Normalization', () => {
  it('formats standard 10-digit Indian number with 91 prefix and no plus', () => {
    expect(cleanPhoneNumberForWhatsApp('9876543210', '91')).toBe('919876543210');
  });

  it('strips leading 0 from 11-digit number and prepends 91', () => {
    expect(cleanPhoneNumberForWhatsApp('09876543210', '91')).toBe('919876543210');
  });

  it('strips spaces, dashes, and parentheses from formatted strings', () => {
    expect(cleanPhoneNumberForWhatsApp('+91 (98765) 43-210', '91')).toBe('919876543210');
  });

  it('handles existing country prefix correctly', () => {
    expect(cleanPhoneNumberForWhatsApp('919876543210', '91')).toBe('919876543210');
  });
});

describe('WhatsApp Link & URI Generation', () => {
  it('generates properly encoded native intent and wa.me URLs', () => {
    const phone = '9876543210';
    const message = 'Hello Aarav,\nOutstanding fee: ₹11,500.\nThank you!';

    const result = generateWhatsAppLink(phone, message, '91');

    expect(result.cleanPhone).toBe('919876543210');
    expect(result.nativeUri).toContain('whatsapp://send?phone=919876543210&text=');
    expect(result.webUrl).toContain('https://wa.me/919876543210?text=');

    // Verify URI decoding matches original message exactly
    expect(decodeURIComponent(result.encodedText)).toBe(message);
    expect(result.encodedText).toContain('%0A'); // Newline encoded
  });

  it('handles special characters, punctuation, and emojis', () => {
    const text = 'Dear Parent 🙏, please pay ₹5,000!';
    const result = generateWhatsAppLink('9876543210', text, '91');

    expect(decodeURIComponent(result.encodedText)).toBe(text);
  });
});
