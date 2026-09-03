/**
 * Contact Information Filter
 *
 * Pre-booking: block (do not deliver) messages that share off-platform contact
 * details — phone, email, links, social handles, or location pins — similar to
 * Airbnb. Only that message is rejected; the conversation stays open.
 * Post-booking (confirmed): filtering is skipped by the API.
 */

// Unicode confusables mapping - characters that look like ASCII but aren't
const CONFUSABLES: Record<string, string> = {
  // Cyrillic lookalikes
  а: 'a',
  е: 'e',
  о: 'o',
  р: 'p',
  с: 'c',
  х: 'x',
  у: 'y',
  і: 'i',
  ј: 'j',
  ѕ: 's',
  ԁ: 'd',
  ɡ: 'g',
  һ: 'h',
  ԛ: 'q',
  А: 'A',
  В: 'B',
  Е: 'E',
  К: 'K',
  М: 'M',
  Н: 'H',
  О: 'O',
  Р: 'P',
  С: 'C',
  Т: 'T',
  Х: 'X',
  У: 'Y',

  // Greek lookalikes
  α: 'a',
  β: 'b',
  ε: 'e',
  ι: 'i',
  κ: 'k',
  ο: 'o',
  ρ: 'p',
  τ: 't',
  υ: 'u',
  ν: 'v',
  ω: 'w',
  χ: 'x',
  Α: 'A',
  Β: 'B',
  Ε: 'E',
  Η: 'H',
  Ι: 'I',
  Κ: 'K',
  Μ: 'M',
  Ν: 'N',
  Ο: 'O',
  Ρ: 'P',
  Τ: 'T',
  Χ: 'X',

  // Full-width characters
  '０': '0',
  '１': '1',
  '２': '2',
  '３': '3',
  '４': '4',
  '５': '5',
  '６': '6',
  '７': '7',
  '８': '8',
  '９': '9',
  ａ: 'a',
  ｂ: 'b',
  ｃ: 'c',
  ｄ: 'd',
  ｅ: 'e',
  ｆ: 'f',
  ｇ: 'g',
  ｈ: 'h',
  ｉ: 'i',
  ｊ: 'j',
  ｋ: 'k',
  ｌ: 'l',
  ｍ: 'm',
  ｎ: 'n',
  ｏ: 'o',
  ｐ: 'p',
  ｑ: 'q',
  ｒ: 'r',
  ｓ: 's',
  ｔ: 't',
  ｕ: 'u',
  ｖ: 'v',
  ｗ: 'w',
  ｘ: 'x',
  ｙ: 'y',
  ｚ: 'z',
  '＠': '@',
  '．': '.',
  '＿': '_',

  // Subscript / superscript / circled
  '₀': '0',
  '₁': '1',
  '₂': '2',
  '₃': '3',
  '₄': '4',
  '₅': '5',
  '₆': '6',
  '₇': '7',
  '₈': '8',
  '₉': '9',
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '①': '1',
  '②': '2',
  '③': '3',
  '④': '4',
  '⑤': '5',
  '⑥': '6',
  '⑦': '7',
  '⑧': '8',
  '⑨': '9',
  '⑩': '10',
  '⓪': '0',

  '⑴': '1',
  '⑵': '2',
  '⑶': '3',
  '⑷': '4',
  '⑸': '5',
  '⑹': '6',
  '⑺': '7',
  '⑻': '8',
  '⑼': '9',

  'Ⅰ': '1',
  'Ⅱ': '2',
  'Ⅲ': '3',
  'Ⅳ': '4',
  'Ⅴ': '5',
  'Ⅵ': '6',
  'Ⅶ': '7',
  'Ⅷ': '8',
  'Ⅸ': '9',
  'Ⅹ': '10',

  '∅': '0',
  Ø: '0',
  ø: '0',
};

const EMOJI_NUMBERS: Record<string, string> = {
  '0️⃣': '0',
  '1️⃣': '1',
  '2️⃣': '2',
  '3️⃣': '3',
  '4️⃣': '4',
  '5️⃣': '5',
  '6️⃣': '6',
  '7️⃣': '7',
  '8️⃣': '8',
  '9️⃣': '9',
  '🔟': '10',
  '0⃣': '0',
  '1⃣': '1',
  '2⃣': '2',
  '3⃣': '3',
  '4⃣': '4',
  '5⃣': '5',
  '6⃣': '6',
  '7⃣': '7',
  '8⃣': '8',
  '9⃣': '9',
};

const WORD_TO_DIGIT: Record<string, string> = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  cero: '0',
  uno: '1',
  dos: '2',
  tres: '3',
  cuatro: '4',
  cinco: '5',
  seis: '6',
  siete: '7',
  ocho: '8',
  nueve: '9',
  diez: '10',
};

const WORD_SUBSTITUTIONS: Record<string, string> = {
  ' at ': '@',
  ' arroba ': '@',
  ' aroba ': '@',
  ' dot ': '.',
  ' punto ': '.',
  ' point ': '.',
  ' period ': '.',
  ' dash ': '-',
  ' hyphen ': '-',
  ' underscore ': '_',
  ' underline ': '_',
  ' plus ': '+',
};

export type ContactBlockReason =
  | 'email'
  | 'phone'
  | 'url'
  | 'social_media'
  | 'location'
  | 'contact_solicitation';

export interface ContactFilterResult {
  blocked: boolean;
  reason?: ContactBlockReason;
  details?: string;
  confidence: 'high' | 'medium' | 'low';
}

/** User-facing copy when a single message is blocked (chat stays open). */
export const CONTACT_BLOCK_USER_MESSAGES: Record<ContactBlockReason, string> = {
  email:
    'This message was blocked because it looks like it includes an email address. Before a booking is confirmed, please keep contact details on VibesBNB.',
  phone:
    'This message was blocked because it looks like it includes a phone number. Before a booking is confirmed, phone numbers can’t be shared in chat.',
  url: 'This message was blocked because it includes a link or website. Before a booking is confirmed, please keep communication on VibesBNB.',
  social_media:
    'This message was blocked because it references social media or another messaging app. Please stay on VibesBNB until a booking is confirmed.',
  location:
    'This message was blocked because it looks like it shares a map pin or private location link. Exact off-platform location details aren’t allowed before a booking is confirmed.',
  contact_solicitation:
    'This message was blocked because it asks to move the conversation off VibesBNB. Please continue chatting here until a booking is confirmed.',
};

export function getContactBlockUserMessage(
  reason?: string | null,
  fallback?: string
): string {
  if (reason && reason in CONTACT_BLOCK_USER_MESSAGES) {
    return CONTACT_BLOCK_USER_MESSAGES[reason as ContactBlockReason];
  }
  return (
    fallback ||
    'This message was blocked because it appears to share contact or off-platform details. Your chat is still open — edit the message and try again without phone numbers, emails, links, or social handles.'
  );
}

function normalizeUnicode(text: string): string {
  let normalized = text;

  for (const [emoji, digit] of Object.entries(EMOJI_NUMBERS)) {
    normalized = normalized.split(emoji).join(digit);
  }

  for (const [confusable, replacement] of Object.entries(CONFUSABLES)) {
    normalized = normalized.split(confusable).join(replacement);
  }

  normalized = normalized.replace(
    /[\u200B-\u200D\uFEFF\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180D\u2060-\u206F\u3164\uFE00-\uFE0F]/g,
    ''
  );

  return normalized;
}

function convertSpelledNumbers(text: string): string {
  let result = ` ${text.toLowerCase()} `;
  const sortedWords = Object.entries(WORD_TO_DIGIT).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [word, digit] of sortedWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(regex, digit);
  }

  return result.trim();
}

function applyWordSubstitutions(text: string): string {
  let result = ` ${text.toLowerCase()} `;
  for (const [word, symbol] of Object.entries(WORD_SUBSTITUTIONS)) {
    result = result.split(word).join(symbol);
  }
  return result.trim();
}

/**
 * Digit runs that look like phone numbers (not prices, years, or short codes).
 */
function extractPhoneLikeSequences(text: string): string[] {
  const sequences: string[] = [];
  // Prefer spans that look phone-shaped (separators / leading +)
  const phoneShaped =
    text.match(
      /(?:\+?\d{1,3}[\s\-.]*)?(?:\(?\d{2,4}\)?[\s\-.]*)?\d{3,4}[\s\-.]*\d{3,4}(?:[\s\-.]*\d{1,4})?/g
    ) || [];

  for (const match of phoneShaped) {
    const digits = match.replace(/\D/g, '');
    // 10–15 digits is typical for real phone numbers; avoid 7-digit false positives from prices/zips
    if (digits.length >= 10 && digits.length <= 15) {
      sequences.push(digits);
    }
  }

  // Spelled-out / emoji-normalized digit soup (e.g. "five five five…")
  const cleaned = text.replace(/[^\d\s\-().+]/g, ' ');
  const loose = cleaned.match(/[\d\s\-().+]{10,}/g) || [];
  for (const match of loose) {
    const digits = match.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 15) {
      sequences.push(digits);
    }
  }

  return sequences;
}

export function containsContactInfo(text: string): ContactFilterResult {
  const normalized = normalizeUnicode(text).toLowerCase();
  const withSubstitutions = applyWordSubstitutions(normalized);
  const withDigits = convertSpelledNumbers(withSubstitutions);

  const emailPatterns = [
    /[a-z0-9._%+\-]+\s*[@＠]\s*[a-z0-9.\-]+\s*[.．]\s*[a-z]{2,}/i,
    /[a-z0-9._%+\-]+\s*@\s*[a-z0-9.\-]+\s*\.\s*[a-z]{2,}/i,
  ];

  for (const pattern of emailPatterns) {
    if (
      pattern.test(normalized) ||
      pattern.test(withSubstitutions) ||
      pattern.test(withDigits)
    ) {
      return {
        blocked: true,
        reason: 'email',
        details: 'Email address detected',
        confidence: 'high',
      };
    }
  }

  const phoneSequences = extractPhoneLikeSequences(withDigits);
  if (phoneSequences.length > 0) {
    return {
      blocked: true,
      reason: 'phone',
      details: 'Phone number detected',
      confidence: 'high',
    };
  }

  // Explicit phone keywords next to digit clusters (catches shorter obfuscations)
  if (
    /\b(phone|cell|mobile|whatsapp|call\s+me|text\s+me|sms)\b/i.test(normalized) &&
    (withDigits.replace(/\D/g, '').length >= 7 ||
      /\d[\d\s\-().]{5,}\d/.test(normalized))
  ) {
    return {
      blocked: true,
      reason: 'phone',
      details: 'Phone number solicitation detected',
      confidence: 'medium',
    };
  }

  const urlPatterns = [
    /https?:\/\//i,
    /www\.[a-z0-9]/i,
    /[a-z0-9\-]+\.(com|org|net|io|co|me|app|dev|xyz|info|biz|us|uk|ca)\b/i,
  ];

  for (const pattern of urlPatterns) {
    if (pattern.test(normalized)) {
      return {
        blocked: true,
        reason: 'url',
        details: 'URL or website detected',
        confidence: 'high',
      };
    }
  }

  const locationPatterns = [
    /maps\.google\./i,
    /goo\.gl\/maps/i,
    /maps\.app\.goo\.gl/i,
    /openstreetmap\.org/i,
    /waze\.com/i,
    /apple\.co\/maps/i,
    /\b(gps|lat(?:itude)?|long(?:itude)?)\b.{0,20}\d{1,3}([.,]\d+)/i,
    /\bdrop\s*(a\s*)?pin\b/i,
    /\bshare\s*(my|the|our)?\s*(exact\s*)?(address|location|pin)\b/i,
  ];

  for (const pattern of locationPatterns) {
    if (pattern.test(normalized)) {
      return {
        blocked: true,
        reason: 'location',
        details: 'Off-platform location sharing detected',
        confidence: 'high',
      };
    }
  }

  // Avoid matching common English words like "line", "wa", "ig" alone
  const socialPatterns = [
    /\b(instagram|insta)\b/i,
    /\b(whatsapp|whats\s*app)\b/i,
    /\b(telegram)\b/i,
    /\b(facebook)\b/i,
    /\b(twitter|x\.com)\b/i,
    /\b(snapchat|snap)\b/i,
    /\b(tiktok|tik\s*tok)\b/i,
    /\b(wechat|weixin)\b/i,
    /\b(viber|signal|discord)\b/i,
    /\b(dm|pm)\s+me\b/i,
    /(?:^|[\s])@[a-z0-9_]{3,}\b/i,
  ];

  for (const pattern of socialPatterns) {
    if (pattern.test(normalized)) {
      return {
        blocked: true,
        reason: 'social_media',
        details: 'Social media reference detected',
        confidence: 'medium',
      };
    }
  }

  const solicitationPatterns = [
    /\b(text|call|email|reach|hit)\s*(me|us)\b/i,
    /\b(my|our)\s*(number|phone|cell|mobile|email|mail)\b/i,
    /\b(send|give)\s*(me|us)\s*(a\s*)?(text|sms|email|number)\b/i,
    /\b(outside|off)\s*(the\s*)?(app|platform|vibesbnb|site)\b/i,
    /\boff[\s-]*platform\b/i,
    /\b(move|switch|continue)\s+(this\s+)?(to|on)\s+(whatsapp|telegram|email|text|sms)\b/i,
  ];

  for (const pattern of solicitationPatterns) {
    if (pattern.test(normalized)) {
      return {
        blocked: true,
        reason: 'contact_solicitation',
        details: 'Contact solicitation detected',
        confidence: 'medium',
      };
    }
  }

  return { blocked: false, confidence: 'low' };
}

/** Mask contact-looking spans for display (optional redaction path). */
export function sanitizeMessage(text: string): string {
  let sanitized = text;

  sanitized = sanitized.replace(
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
    '[email removed]'
  );

  sanitized = sanitized.replace(
    /(\+?\d[\d\s().-]{8,}\d)/g,
    '[phone removed]'
  );

  sanitized = sanitized.replace(/(https?:\/\/[^\s]+)/gi, '[link removed]');
  sanitized = sanitized.replace(
    /\bwww\.[a-z0-9\-._/?#%=&]+/gi,
    '[link removed]'
  );

  return sanitized;
}

export function validateMessage(
  text: string,
  userId?: string
): {
  allowed: boolean;
  flagged: boolean;
  reason?: string;
  details?: string;
  userMessage?: string;
} {
  const result = containsContactInfo(text);

  if (result.blocked) {
    console.warn(
      `[ContactFilter] Blocked message${userId ? ` from ${userId}` : ''}: ${result.reason} - ${result.details}`
    );
    return {
      allowed: false,
      flagged: true,
      reason: result.reason,
      details: result.details,
      userMessage: getContactBlockUserMessage(result.reason),
    };
  }

  return { allowed: true, flagged: false };
}
