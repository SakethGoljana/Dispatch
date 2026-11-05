/**
 * SchoolPing Design Tokens - Colors
 * Premium, modern EdTech/FinTech palette with high-contrast Light & Dark themes.
 */

export const lightColors = {
  // Backgrounds
  background: '#F8FAFC',        // Crisp cool snow canvas
  surface: '#FFFFFF',           // Pure white elevated card
  surfaceSubtle: '#F1F5F9',     // Refined secondary container
  surfaceHover: '#E2E8F0',      // Hover / pressed state surface

  // Text
  textPrimary: '#0F172A',       // Deep obsidian slate for high readability
  textSecondary: '#475569',     // Sophisticated slate gray
  textTertiary: '#94A3B8',      // Soft silver for hints and placeholders
  textInverse: '#FFFFFF',       // Crisp white for buttons and badges

  // Primary Accent (Vibrant Royal Indigo)
  primary: '#4F46E5',           // Premium Indigo
  primaryLight: '#6366F1',      // Interactive highlight
  primarySubtle: '#EEF2FF',     // Pill & active item tint
  primaryBorder: '#C7D2FE',     // Subtle active border

  // Semantic Status Tones
  success: '#059669',           // Emerald text
  successBg: '#ECFDF5',         // Soft emerald tint
  successBorder: '#A7F3D0',

  warning: '#D97706',           // Warm amber
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',

  error: '#DC2626',             // Clean crimson
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',

  info: '#2563EB',
  infoBg: '#EFF6FF',
  infoBorder: '#BFDBFE',

  // Structural & Borders
  border: '#E2E8F0',            // Subtle elegant divider
  borderSubtle: '#F1F5F9',      // Hairline divider
  borderFocus: '#4F46E5',       // Focus ring

  // WhatsApp Identity
  whatsapp: '#059669',          // Fresh emerald
  whatsappSubtle: '#ECFDF5',
  whatsappDark: '#047857',
} as const;

export const darkColors = {
  // Backgrounds
  background: '#090D16',        // Deep obsidian slate (never muddy)
  surface: '#111827',           // Elevated dark slate surface
  surfaceSubtle: '#1E293B',     // Secondary dark container
  surfaceHover: '#334155',      // Pressed surface

  // Text
  textPrimary: '#F8FAFC',       // Crisp high-contrast white
  textSecondary: '#94A3B8',     // Muted silver slate
  textTertiary: '#64748B',      // Subtle placeholder text
  textInverse: '#FFFFFF',       // White text for primary buttons

  // Primary Accent (Electric Indigo for dark mode)
  primary: '#6366F1',           // Glowing vibrant indigo
  primaryLight: '#818CF8',
  primarySubtle: '#1E1B4B',
  primaryBorder: '#4338CA',

  // Semantic Status Tones
  success: '#34D399',
  successBg: '#064E3B',
  successBorder: '#059669',

  warning: '#FBBF24',
  warningBg: '#451A03',
  warningBorder: '#B45309',

  error: '#F87171',
  errorBg: '#450A0A',
  errorBorder: '#B91C1C',

  info: '#60A5FA',
  infoBg: '#1E3A8A',
  infoBorder: '#3B82F6',

  // Structural & Borders
  border: '#1E293B',            // Clean slate border
  borderSubtle: '#162032',
  borderFocus: '#6366F1',

  // WhatsApp Identity
  whatsapp: '#10B981',          // Glowing emerald
  whatsappSubtle: '#064E3B',
  whatsappDark: '#059669',
} as const;

// Default alias for backward compatibility
export const colors = lightColors;

export type Colors = typeof lightColors;
