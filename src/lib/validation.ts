/**
 * TerraTern Lead Page Engine - Universal Validation Module
 * Shared between Server API routes and Client Connector Script
 */

import { parsePhoneNumberFromString, isValidPhoneNumber, type CountryCode } from 'libphonenumber-js';

// Common disposable email domains list
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'throwawaymail.com',
  'sharklasers.com',
  'yopmail.com',
  'getairmail.com',
  'temp-mail.org',
  'fakeinbox.com',
  'dispostable.com',
  'trashmail.com',
  'generator.email',
  'nada.ltd',
  'mohmal.com',
  'crazymailing.com',
  'burnermail.io',
  'maildrop.cc',
  'getnada.com',
  'inboxkitten.com',
]);

// Email typo corrections dictionary
export const EMAIL_TYPO_MAP: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmaul.com': 'gmail.com',
  'gemail.com': 'gmail.com',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yahu.com': 'yahoo.com',
  'yaho.co.in': 'yahoo.co.in',
  'hotmial.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'ootlook.com': 'outlook.com',
  'iclod.com': 'icloud.com',
  'icld.com': 'icloud.com',
  'iclou.com': 'icloud.com',
  'redifmail.com': 'rediffmail.com',
  'rediffmial.com': 'rediffmail.com',
};

// Junk / fake name patterns
const JUNK_NAME_PATTERNS = [
  'asdf', 'test', 'xxx', 'qwerty', 'foo', 'bar', 'admin', 'user',
  'null', 'undefined', 'fake', 'dummy', 'testing', 'sample', 'demo',
  'abcdef', 'na', 'none', 'unknown'
];

// Fake Indian phone numbers
const FAKE_PHONE_PATTERNS = new Set([
  '9999999999',
  '8888888888',
  '7777777777',
  '6666666666',
  '0000000000',
  '1111111111',
  '2222222222',
  '3333333333',
  '4444444444',
  '5555555555',
  '1234567890',
  '0123456789',
  '9876543210',
  '9898989898',
  '1212121212',
  '9090909090',
]);

export interface NameValidationResult {
  valid: boolean;
  error?: string;
  cleanedName?: string;
}

export interface EmailValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string;
  cleanedEmail?: string;
}

export interface PhoneValidationResult {
  valid: boolean;
  error?: string;
  e164?: string;
  formatted?: string;
}

export interface LeadValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  suggestions?: { email?: string };
  cleaned?: {
    name: string;
    email: string | null;
    phone_e164: string | null;
    country_code: string;
    consent: boolean;
  };
}

/**
 * Validates full name:
 * - 2-60 characters
 * - Letters, spaces, dots, hyphens
 * - Rejects numbers-only, single repeated character, and junk words
 */
export function validateName(name: unknown): NameValidationResult {
  if (typeof name !== 'string' || !name.trim()) {
    return { valid: false, error: 'Full name is required.' };
  }

  const trimmed = name.trim().replace(/\s+/g, ' ');

  if (trimmed.length < 2 || trimmed.length > 60) {
    return { valid: false, error: 'Name must be between 2 and 60 characters.' };
  }

  // Letters, spaces, dots, hyphens only
  const validCharsRegex = /^[a-zA-Z\u00C0-\u024F\s.'-]+$/;
  if (!validCharsRegex.test(trimmed)) {
    return { valid: false, error: 'Name can only contain letters, spaces, dots, and hyphens.' };
  }

  // Reject single repeated letter (e.g. 'aaaa', 'zzzz', '.....')
  const uniqueChars = new Set(trimmed.toLowerCase().replace(/[\s.'-]/g, ''));
  if (uniqueChars.size <= 1) {
    return { valid: false, error: 'Please enter a valid full name.' };
  }

  // Reject junk keywords
  const lower = trimmed.toLowerCase();
  for (const junk of JUNK_NAME_PATTERNS) {
    if (lower === junk || lower.startsWith(junk + ' ') || lower.endsWith(' ' + junk)) {
      return { valid: false, error: 'Please enter your real full name.' };
    }
  }

  return { valid: true, cleanedName: trimmed };
}

/**
 * Validates email address:
 * - RFC compliant syntax
 * - Detects typos and suggests corrections (e.g. gmial.com -> gmail.com)
 * - Rejects disposable email domains
 * - Server-side optional MX record verification
 */
export async function validateEmail(
  email: unknown,
  options: { checkMx?: boolean } = {}
): Promise<EmailValidationResult> {
  if (typeof email !== 'string' || !email.trim()) {
    return { valid: false, error: 'Email address is required.' };
  }

  const cleaned = email.trim().toLowerCase();

  // Basic RFC regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(cleaned)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  const [username, domain] = cleaned.split('@');
  if (!username || !domain) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  // Check typo dictionary
  let suggestion: string | undefined;
  if (EMAIL_TYPO_MAP[domain]) {
    suggestion = `${username}@${EMAIL_TYPO_MAP[domain]}`;
  }

  // Check disposable email domain
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      valid: false,
      error: 'Disposable email addresses are not accepted. Please use a personal or business email.',
    };
  }

  // Server-side MX check if requested
  if (options.checkMx && typeof window === 'undefined') {
    try {
      const dns = await import('dns');
      const mxRecords = await dns.promises.resolveMx(domain).catch(() => []);
      if (!mxRecords || mxRecords.length === 0) {
        return {
          valid: false,
          error: `The email domain "@${domain}" cannot receive emails. Please verify your address.`,
          suggestion,
        };
      }
    } catch {
      // If DNS lookup times out or fails network, fail-open to avoid blocking real users
    }
  }

  return { valid: true, cleanedEmail: cleaned, suggestion };
}

/**
 * Synchronous email check for client-side forms
 */
export function validateEmailSync(email: unknown): EmailValidationResult {
  if (typeof email !== 'string' || !email.trim()) {
    return { valid: false, error: 'Email address is required.' };
  }

  const cleaned = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(cleaned)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  const [username, domain] = cleaned.split('@');
  if (!username || !domain) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  let suggestion: string | undefined;
  if (EMAIL_TYPO_MAP[domain]) {
    suggestion = `${username}@${EMAIL_TYPO_MAP[domain]}`;
  }

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      valid: false,
      error: 'Disposable email addresses are not accepted. Please use a personal or business email.',
    };
  }

  return { valid: true, cleanedEmail: cleaned, suggestion };
}

/**
 * Validates phone numbers:
 * - Default India (+91): exactly 10 digits starting with 6-9
 * - Rejects fake patterns (e.g. 9999999999, 1234567890)
 * - International countries supported via libphonenumber-js
 * - Normalizes to E.164 (e.g. +919876543210)
 */
export function validatePhone(phone: unknown, countryCode: string = 'IN'): PhoneValidationResult {
  if (typeof phone !== 'string' || !phone.trim()) {
    return { valid: false, error: 'Phone number is required.' };
  }

  const countryUpper = (countryCode || 'IN').toUpperCase() as CountryCode;
  const raw = phone.trim();

  // Special checks for India (+91)
  if (countryUpper === 'IN' || raw.startsWith('+91') || (raw.length === 10 && !raw.startsWith('+'))) {
    // Extract raw digits
    const digitsOnly = raw.replace(/\D/g, '');
    const tenDigits = digitsOnly.length === 12 && digitsOnly.startsWith('91')
      ? digitsOnly.slice(2)
      : digitsOnly.length === 11 && digitsOnly.startsWith('0')
      ? digitsOnly.slice(1)
      : digitsOnly;

    if (tenDigits.length !== 10) {
      return { valid: false, error: 'Indian mobile numbers must be exactly 10 digits.' };
    }

    if (!/^[6-9]/.test(tenDigits)) {
      return { valid: false, error: 'Indian mobile numbers must start with 6, 7, 8, or 9.' };
    }

    if (FAKE_PHONE_PATTERNS.has(tenDigits)) {
      return { valid: false, error: 'Please enter a real phone number.' };
    }

    // Check repeated digits
    const uniqueDigits = new Set(tenDigits);
    if (uniqueDigits.size <= 2) {
      return { valid: false, error: 'Please enter a valid active mobile number.' };
    }

    return {
      valid: true,
      e164: `+91${tenDigits}`,
      formatted: `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`,
    };
  }

  // International phone check via libphonenumber-js
  try {
    const phoneNumber = parsePhoneNumberFromString(raw, countryUpper);
    if (!phoneNumber || !phoneNumber.isValid()) {
      return { valid: false, error: `Please enter a valid phone number for country ${countryUpper}.` };
    }

    const e164 = phoneNumber.format('E.164');
    return {
      valid: true,
      e164,
      formatted: phoneNumber.formatInternational(),
    };
  } catch {
    return { valid: false, error: 'Invalid phone number format.' };
  }
}

/**
 * Validates consent checkbox
 */
export function validateConsent(consent: unknown): { valid: boolean; error?: string } {
  if (consent === true || consent === 'true' || consent === 1 || consent === '1') {
    return { valid: true };
  }
  return { valid: false, error: 'You must agree to continue.' };
}

/**
 * Universal complete lead validation:
 * Supports standard landing forms as well as any custom HTML/React page/calculator/quiz.
 * - Requires at least one contact channel (phone or email)
 * - Name defaults to 'Visitor' if not asked or empty
 * - Consent defaults to true unless explicitly unchecked (false)
 */
export async function validateLead(
  data: {
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    country_code?: string;
    consent?: unknown;
    honeypot?: unknown;
  },
  options: { checkMx?: boolean } = {}
): Promise<LeadValidationResult> {
  const errors: Record<string, string> = {};

  // Honeypot spam trap
  if (data.honeypot && String(data.honeypot).trim() !== '') {
    return {
      valid: false,
      errors: { honeypot: 'Spam detected.' },
    };
  }

  // Name: Optional for simple calculators/quizzes, defaults to 'Visitor'
  let finalName = 'Visitor';
  if (data.name && typeof data.name === 'string' && data.name.trim()) {
    const nameRes = validateName(data.name);
    if (nameRes.valid && nameRes.cleanedName) {
      finalName = nameRes.cleanedName;
    } else if (nameRes.error) {
      // If user typed an invalid name, report it
      errors.name = nameRes.error;
    }
  }

  // Contact Method: At least one of email or phone is required
  const hasEmail = data.email && typeof data.email === 'string' && data.email.trim();
  const hasPhone = data.phone && (typeof data.phone === 'string' || typeof data.phone === 'number') && String(data.phone).trim();

  if (!hasEmail && !hasPhone) {
    errors.contact = 'Please provide a valid phone number or email address.';
  }

  let finalEmail: string | null = null;
  let emailSuggestion: string | undefined;
  if (hasEmail) {
    const emailRes = await validateEmail(data.email, { checkMx: options.checkMx });
    if (!emailRes.valid) {
      errors.email = emailRes.error!;
    } else {
      finalEmail = emailRes.cleanedEmail!;
      emailSuggestion = emailRes.suggestion;
    }
  }

  let finalPhone: string | null = null;
  const country = (data.country_code || 'IN').toUpperCase();
  if (hasPhone) {
    const phoneRes = validatePhone(data.phone, country);
    if (!phoneRes.valid) {
      errors.phone = phoneRes.error!;
    } else {
      finalPhone = phoneRes.e164!;
    }
  }

  // Consent: Defaults to true for interactive widgets unless explicitly false
  if (data.consent === false || data.consent === 'false' || data.consent === 0) {
    errors.consent = 'You must agree to continue.';
  }

  const valid = Object.keys(errors).length === 0;

  return {
    valid,
    errors,
    suggestions: emailSuggestion ? { email: emailSuggestion } : undefined,
    cleaned: valid
      ? {
          name: finalName,
          email: finalEmail,
          phone_e164: finalPhone,
          country_code: country,
          consent: true,
        }
      : undefined,
  };
}
