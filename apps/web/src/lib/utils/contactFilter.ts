/**
 * Contact Information Filter
 * 
 * Comprehensive detection of contact details in messages to prevent
 * users from bypassing platform communication. Handles:
 * - Unicode confusables (Cyrillic, Greek, full-width characters)
 * - Emoji numbers (1️⃣2️⃣3️⃣)
 * - Spelled-out numbers in multiple languages
 * - Leet speak substitutions
 * - Social media handles and URLs
 * - Common obfuscation techniques
 */

// Unicode confusables mapping - characters that look like ASCII but aren't
const CONFUSABLES: Record<string, string> = {
  // Cyrillic lookalikes
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x', 'у': 'y',
  'і': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd', 'ɡ': 'g', 'һ': 'h', 'ԛ': 'q',
  'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H',
  'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'Х': 'X', 'У': 'Y',
  
  // Greek lookalikes
  'α': 'a', 'β': 'b', 'ε': 'e', 'ι': 'i', 'κ': 'k', 'ο': 'o',
  'ρ': 'p', 'τ': 't', 'υ': 'u', 'ν': 'v', 'ω': 'w', 'χ': 'x',
  'Α': 'A', 'Β': 'B', 'Ε': 'E', 'Η': 'H', 'Ι': 'I', 'Κ': 'K',
  'Μ': 'M', 'Ν': 'N', 'Ο': 'O', 'Ρ': 'P', 'Τ': 'T', 'Χ': 'X',
  
  // Full-width characters (common in Asian text)
  '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
  '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
  'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e',
  'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j',
  'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o',
  'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't',
  'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x', 'ｙ': 'y', 'ｚ': 'z',
  '＠': '@', '．': '.', '＿': '_',
  
  // Subscript numbers
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  
  // Superscript numbers
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  
  // Circled numbers
  '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5',
  '⑥': '6', '⑦': '7', '⑧': '8', '⑨': '9', '⑩': '10',
  '⓪': '0', '⓵': '1', '⓶': '2', '⓷': '3', '⓸': '4',
  '⓹': '5', '⓺': '6', '⓻': '7', '⓼': '8', '⓽': '9',
  
  // Parenthesized numbers
  '⑴': '1', '⑵': '2', '⑶': '3', '⑷': '4', '⑸': '5',
  '⑹': '6', '⑺': '7', '⑻': '8', '⑼': '9',
  
  // Roman numerals (basic)
  'Ⅰ': '1', 'Ⅱ': '2', 'Ⅲ': '3', 'Ⅳ': '4', 'Ⅴ': '5',
  'Ⅵ': '6', 'Ⅶ': '7', 'Ⅷ': '8', 'Ⅸ': '9', 'Ⅹ': '10',
  
  // Mathematical symbols
  '∅': '0', 'Ø': '0', 'ø': '0',
};

// Emoji numbers (keycap sequences)
const EMOJI_NUMBERS: Record<string, string> = {
  '0️⃣': '0', '1️⃣': '1', '2️⃣': '2', '3️⃣': '3', '4️⃣': '4',
  '5️⃣': '5', '6️⃣': '6', '7️⃣': '7', '8️⃣': '8', '9️⃣': '9',
  '🔟': '10',
  // Alternative representations
  '0⃣': '0', '1⃣': '1', '2⃣': '2', '3⃣': '3', '4⃣': '4',
  '5⃣': '5', '6⃣': '6', '7⃣': '7', '8⃣': '8', '9⃣': '9',
};

// Spelled-out numbers in multiple languages (unique keys only)
const WORD_TO_DIGIT: Record<string, string> = {
  // English
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
  'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
  'ten': '10',
  
  // Spanish (excluding duplicates)
  'cero': '0', 'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4',
  'cinco': '5', 'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9',
  'diez': '10',
  
  // French (excluding 'six' - same as English)
  'zéro': '0', 'un': '1', 'deux': '2', 'trois': '3', 'quatre': '4',
  'cinq': '5', 'sept': '7', 'huit': '8', 'neuf': '9', 'dix': '10',
  
  // German (excluding 'null' conflicts with programming)
  'eins': '1', 'zwei': '2', 'drei': '3', 'vier': '4',
  'fünf': '5', 'funf': '5', 'sechs': '6', 'sieben': '7', 'acht': '8', 'neun': '9',
  'zehn': '10',
  
  // Italian (excluding 'zero' - same as English)
  'una': '1', 'due': '2', 'tre': '3', 'quattro': '4',
  'cinque': '5', 'sei': '6', 'sette': '7', 'otto': '8', 'nove': '9',
  'dieci': '10',
  
  // Portuguese (unique entries only)
  'um': '1', 'dois': '2', 'duas': '2', 'três': '3', 'quatro': '4',
  'oito': '8', 'dez': '10',
  
  // Hindi (transliterated, excluding 'do' - too common)
  'ek': '1', 'teen': '3', 'chaar': '4', 'char': '4',
  'paanch': '5', 'panch': '5', 'chhah': '6', 'saat': '7', 'sat': '7',
  'aath': '8', 'nau': '9', 'das': '10',
  
  // Arabic (transliterated)
  'sifr': '0', 'wahid': '1', 'ithnan': '2', 'thalatha': '3', 'arba': '4',
  'khamsa': '5', 'sitta': '6', 'thamania': '8', 'tisa': '9',
  
  // Chinese (pinyin, excluding short common words)
  'ling': '0', 'er': '2', 'san': '3',
  'wu': '5', 'liu': '6', 'qi': '7', 'jiu': '9',
  
  // Japanese (romaji)
  'rei': '0', 'ichi': '1', 'yon': '4',
  'roku': '6', 'nana': '7', 'hachi': '8', 'kyuu': '9',
};

// Common word substitutions for symbols
const WORD_SUBSTITUTIONS: Record<string, string> = {
  ' at ': '@', ' arroba ': '@', ' aroba ': '@',
  ' dot ': '.', ' punto ': '.', ' point ': '.', ' period ': '.',
  ' dash ': '-', ' hyphen ': '-',
  ' underscore ': '_', ' underline ': '_',
  ' plus ': '+',
  ' slash ': '/',
};

/**
 * Normalize text by replacing confusable characters with ASCII equivalents
 */
function normalizeUnicode(text: string): string {
  let normalized = text;
  
  // Replace emoji numbers first (they're multi-character)
  for (const [emoji, digit] of Object.entries(EMOJI_NUMBERS)) {
    normalized = normalized.split(emoji).join(digit);
  }
  
  // Replace single-character confusables
  for (const [confusable, replacement] of Object.entries(CONFUSABLES)) {
    normalized = normalized.split(confusable).join(replacement);
  }
  
  // Remove zero-width characters and invisible separators
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180D\u2060-\u206F\u3164\uFE00-\uFE0F]/g, '');
  
  return normalized;
}

/**
 * Convert spelled-out numbers to digits
 */
function convertSpelledNumbers(text: string): string {
  let result = ' ' + text.toLowerCase() + ' ';
  
  // Sort by length descending to match longer words first
  const sortedWords = Object.entries(WORD_TO_DIGIT)
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [word, digit] of sortedWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(regex, digit);
  }
  
  return result.trim();
}

/**
 * Apply word substitutions (at -> @, dot -> ., etc.)
 */
function applyWordSubstitutions(text: string): string {
  let result = ' ' + text.toLowerCase() + ' ';
  
  for (const [word, symbol] of Object.entries(WORD_SUBSTITUTIONS)) {
    result = result.split(word).join(symbol);
  }
  
  return result.trim();
}

/**
 * Extract all digit sequences from text
 */
function extractDigitSequences(text: string): string[] {
  const sequences: string[] = [];
  
  // Remove all non-digits and non-separators, then find sequences
  const cleaned = text.replace(/[^\d\s\-().+]/g, ' ');
  const matches = cleaned.match(/[\d\s\-().+]{4,}/g);
  
  if (matches) {
    for (const match of matches) {
      const digits = match.replace(/\D/g, '');
      if (digits.length >= 7 && digits.length <= 15) {
        sequences.push(digits);
      }
    }
  }
  
  return sequences;
}

export interface ContactFilterResult {
  blocked: boolean;
  reason?: 'email' | 'phone' | 'url' | 'social_media' | 'contact_solicitation';
  details?: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Check if text contains contact information
 */
export function containsContactInfo(text: string): ContactFilterResult {
  // Step 1: Normalize the text
  const normalized = normalizeUnicode(text).toLowerCase();
  const withSubstitutions = applyWordSubstitutions(normalized);
  const withDigits = convertSpelledNumbers(withSubstitutions);
  
  // Step 2: Check for email patterns
  const emailPatterns = [
    // Standard email
    /[a-z0-9._%+\-]+\s*[@＠]\s*[a-z0-9.\-]+\s*[.．]\s*[a-z]{2,}/i,
    // Obfuscated email (at/dot spelled out)
    /[a-z0-9._%+\-]+\s*@\s*[a-z0-9.\-]+\s*\.\s*[a-z]{2,}/i,
  ];
  
  for (const pattern of emailPatterns) {
    if (pattern.test(normalized) || pattern.test(withSubstitutions) || pattern.test(withDigits)) {
      return { 
        blocked: true, 
        reason: 'email', 
        details: 'Email address detected',
        confidence: 'high' 
      };
    }
  }
  
  // Step 3: Check for phone numbers
  const phoneSequences = extractDigitSequences(withDigits);
  if (phoneSequences.length > 0) {
    // Additional check: see if original text has digit-like content spread out
    const originalDigits = text.replace(/\D/g, '');
    const normalizedDigits = withDigits.replace(/\D/g, '');
    
    if (normalizedDigits.length >= 7 || originalDigits.length >= 7) {
      return { 
        blocked: true, 
        reason: 'phone', 
        details: 'Phone number detected',
        confidence: 'high' 
      };
    }
  }
  
  // Step 4: Check for URLs
  const urlPatterns = [
    /https?:\/\//i,
    /www\.[a-z0-9]/i,
    /[a-z0-9\-]+\.(com|org|net|io|co|me|app|dev|xyz|info|biz)\b/i,
  ];
  
  for (const pattern of urlPatterns) {
    if (pattern.test(normalized)) {
      return { 
        blocked: true, 
        reason: 'url', 
        details: 'URL or website detected',
        confidence: 'high' 
      };
    }
  }
  
  // Step 5: Check for social media references
  const socialPatterns = [
    /\b(instagram|insta|ig)\b/i,
    /\b(whatsapp|whats\s*app|wa)\b/i,
    /\b(telegram|tg)\b/i,
    /\b(facebook|fb)\b/i,
    /\b(twitter|x\.com)\b/i,
    /\b(snapchat|snap)\b/i,
    /\b(tiktok|tik\s*tok)\b/i,
    /\b(wechat|weixin)\b/i,
    /\b(line|viber|signal)\b/i,
    /\b(discord)\b/i,
    /@[a-z0-9_]{3,}/i, // Social media handles
  ];
  
  for (const pattern of socialPatterns) {
    if (pattern.test(normalized)) {
      return { 
        blocked: true, 
        reason: 'social_media', 
        details: 'Social media reference detected',
        confidence: 'medium' 
      };
    }
  }
  
  // Step 6: Check for contact solicitation phrases
  const solicitationPatterns = [
    /\b(text|call|message|contact|reach|hit)\s*(me|us)\b/i,
    /\b(my|our)\s*(number|phone|cell|mobile|email|mail|contact)\b/i,
    /\b(send|give)\s*(me|us)\s*(a\s*)?(text|message|sms|email)\b/i,
    /\b(outside|off)\s*(the\s*)?(app|platform|vibesbnb|site)\b/i,
    /\b(direct|private)\s*(message|contact|communication)\b/i,
    /\boff\s*platform\b/i,
  ];
  
  for (const pattern of solicitationPatterns) {
    if (pattern.test(normalized)) {
      return { 
        blocked: true, 
        reason: 'contact_solicitation', 
        details: 'Contact solicitation detected',
        confidence: 'medium' 
      };
    }
  }
  
  return { blocked: false, confidence: 'low' };
}

/**
 * Sanitize message for display (mask detected contact info)
 * Not currently used but available for future use
 */
export function sanitizeMessage(text: string): string {
  let sanitized = text;
  
  // Mask email addresses
  sanitized = sanitized.replace(
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
    '[email removed]'
  );
  
  // Mask phone numbers (simple pattern)
  sanitized = sanitized.replace(
    /(\+?\d[\d\s().-]{7,}\d)/g,
    '[phone removed]'
  );
  
  // Mask URLs
  sanitized = sanitized.replace(
    /(https?:\/\/[^\s]+)/gi,
    '[link removed]'
  );
  
  return sanitized;
}

/**
 * Server-side validation with logging
 */
export function validateMessage(
  text: string, 
  userId?: string
): {
  allowed: boolean;
  flagged: boolean;
  reason?: string;
  details?: string;
} {
  const result = containsContactInfo(text);
  
  if (result.blocked) {
    // Log blocked attempts for review
    console.warn(`[ContactFilter] Blocked message${userId ? ` from ${userId}` : ''}: ${result.reason} - ${result.details}`);
    return { 
      allowed: false, 
      flagged: true, 
      reason: result.reason,
      details: result.details 
    };
  }
  
  return { allowed: true, flagged: false };
}
