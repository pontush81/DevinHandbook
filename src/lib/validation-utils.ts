import DOMPurify from 'isomorphic-dompurify';

export interface ValidationResult {
  isValid: boolean;
  sanitized?: string;
  error?: string;
}

// Email validation
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Ogiltig e-postadress' };
  }
  return { isValid: true, sanitized: email.toLowerCase().trim() };
}

// Subdomain validation
export function validateSubdomain(subdomain: string): ValidationResult {
  if (!subdomain || subdomain.length < 3 || subdomain.length > 63) {
    return { isValid: false, error: 'Subdomän måste vara 3-63 tecken' };
  }
  
  const subdomainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
  if (!subdomainRegex.test(subdomain)) {
    return { isValid: false, error: 'Subdomän får endast innehålla bokstäver, siffror och bindestreck' };
  }
  
  const reserved = ['www', 'api', 'admin', 'mail', 'ftp', 'localhost'];
  if (reserved.includes(subdomain.toLowerCase())) {
    return { isValid: false, error: 'Denna subdomän är reserverad' };
  }
  
  return { isValid: true, sanitized: subdomain.toLowerCase() };
}

// HTML content sanitization
export function sanitizeHtml(html: string): ValidationResult {
  try {
    const sanitized = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'],
      ALLOWED_ATTR: ['class', 'id'],
      KEEP_CONTENT: true
    });
    return { isValid: true, sanitized };
  } catch (error) {
    return { isValid: false, error: 'HTML-innehållet kunde inte sanitiseras' };
  }
}

// Text sanitization (remove HTML tags)
export function sanitizeText(text: string): ValidationResult {
  if (typeof text !== 'string') {
    return { isValid: false, error: 'Textvärde krävs' };
  }
  
  const sanitized = DOMPurify.sanitize(text, { 
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true 
  }).trim();
  
  return { isValid: true, sanitized };
}

// UUID validation
export function validateUuid(uuid: string): ValidationResult {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    return { isValid: false, error: 'Ogiltigt UUID-format' };
  }
  return { isValid: true, sanitized: uuid.toLowerCase() };
}

// Handbook ID validation
export function validateHandbookId(handbookId: string): ValidationResult {
  if (!handbookId || !/^[a-zA-Z0-9-_]+$/.test(handbookId)) {
    return { isValid: false, error: 'Ogiltigt handbok-ID format' };
  }
  return { isValid: true, sanitized: handbookId };
}

// URL validation
export function validateUrl(url: string): ValidationResult {
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { isValid: false, error: 'Endast HTTP/HTTPS URLs tillåtna' };
    }
    return { isValid: true, sanitized: url };
  } catch {
    return { isValid: false, error: 'Ogiltig URL' };
  }
}

// File name validation
export function validateFileName(fileName: string): ValidationResult {
  if (!fileName || fileName.length > 255) {
    return { isValid: false, error: 'Filnamn måste vara 1-255 tecken' };
  }
  
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(fileName)) {
    return { isValid: false, error: 'Filnamn innehåller otillåtna tecken' };
  }
  
  return { isValid: true, sanitized: fileName.trim() };
}

// CSRF token validation
export function validateCSRFToken(token: string, expected: string): boolean {
  if (!token || !expected || token.length !== expected.length) {
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}

// General input sanitization for API endpoints
export function sanitizeApiInput(input: any): any {
  if (typeof input === 'string') {
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], KEEP_CONTENT: true }).trim();
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeApiInput(value);
    }
    return sanitized;
  }
  
  return input;
}