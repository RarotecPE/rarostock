/**
 * Sanitizador de dados para conformidade com a LGPD e segurança da informação.
 * Ofusca senhas, tokens, hashes confidenciais, CPFs e números de cartão de crédito.
 */

const SENSITIVE_KEY_PATTERNS = [
  /pass(word)?/i,
  /secret/i,
  /token/i,
  /auth(orization)?/i,
  /bearer/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /credit[_-]?card/i,
  /cvv/i,
  /security[_-]?code/i,
  /cartao/i,
  /pin/i,
];

// Regex para detecção de CPF (formatado ou não)
const CPF_REGEX = /\b(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})\b/g;

// Regex para detecção de número de cartão (13 a 19 dígitos)
const CARD_REGEX = /\b(?:\d[ -]*?){13,19}\b/g;

/**
 * Aplica máscara em strings com números de CPF.
 * Ex: 123.456.789-00 -> 123.***.***-00
 */
export function maskCpf(text: string): string {
  return text.replace(CPF_REGEX, (_match, p1, _p2, _p3, p4) => `${p1}.***.***-${p4}`);
}

/**
 * Aplica máscara em números de cartão de crédito.
 * Ex: 4111 2222 3333 4444 -> **** **** **** 4444
 */
export function maskCreditCard(text: string): string {
  return text.replace(CARD_REGEX, (match) => {
    const clean = match.replace(/\D/g, '');
    if (clean.length < 13 || clean.length > 19) return match;
    const last4 = clean.slice(-4);
    return `****-****-****-${last4}`;
  });
}

function maskSensitiveText(val: string): string {
  let masked = maskCpf(val);
  masked = maskCreditCard(masked);
  return masked;
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Higieniza recursivamente qualquer objeto ou array antes de persistir em log de auditoria.
 */
export function sanitizeData<T>(data: T, depth = 0): T {
  if (depth > 8) {
    return '[TRUNCATED_MAX_DEPTH]' as unknown as T;
  }

  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return maskSensitiveText(data) as unknown as T;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item, depth + 1)) as unknown as T;
  }

  if (typeof data === 'object') {
    const sanitizedObj: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        sanitizedObj[key] = '[REDACTED]';
      } else {
        sanitizedObj[key] = sanitizeData(value, depth + 1);
      }
    }

    return sanitizedObj as T;
  }

  return String(data) as unknown as T;
}

