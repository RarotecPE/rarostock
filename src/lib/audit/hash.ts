import { createHmac } from 'crypto';
import { AuditEnvelope } from './types';

/**
 * Obtém a chave secreta de assinatura criptográfica para prova de integridade.
 */
function getSystemSecret(): string {
  const secret = process.env.AUDIT_SYSTEM_SECRET;
  if (!secret) {
    // Chave padrão determinística de desenvolvimento (em prod requer AUDIT_SYSTEM_SECRET)
    return 'rarotec-audit-fallback-dev-key-change-in-production-2026';
  }
  return secret;
}

/**
 * Serializa de forma canônica e determinística o envelope (chaves ordenadas alfabeticamente).
 */
export function canonicalJsonStringify(data: unknown): string {
  if (data === null || typeof data !== 'object') {
    return JSON.stringify(data);
  }

  if (Array.isArray(data)) {
    return '[' + data.map((item) => canonicalJsonStringify(item)).join(',') + ']';
  }

  const keys = Object.keys(data as Record<string, unknown>).sort();
  const pairs = keys.map((key) => {
    const val = (data as Record<string, unknown>)[key];
    return `${JSON.stringify(key)}:${canonicalJsonStringify(val)}`;
  });

  return '{' + pairs.join(',') + '}';
}

/**
 * Calcula o HMAC SHA-256 de integridade encadeada para um evento de auditoria.
 * O hash cobre o identificador, timestamp, sistema, ação, ator, alvos, detalhes e o prevHash.
 */
export function calculateEventHash(
  envelope: Omit<AuditEnvelope, 'hash' | 'searchTokens' | 'ingestedAt'>
): string {
  const secret = getSystemSecret();
  const canonicalString = canonicalJsonStringify({
    _id: envelope._id,
    timestamp: envelope.timestamp,
    system: envelope.system,
    category: envelope.category,
    action: envelope.action,
    severity: envelope.severity,
    status: envelope.status,
    actor: envelope.actor,
    targets: envelope.targets,
    context: envelope.context,
    changes: envelope.changes,
    details: envelope.details,
    prevHash: envelope.prevHash || '',
  });

  return createHmac('sha256', secret).update(canonicalString).digest('hex');
}

/**
 * Verifica se o hash de um evento corresponde exatamente ao seu conteúdo.
 */
export function verifyEventHash(envelope: AuditEnvelope): boolean {
  if (!envelope.hash) return false;
  const calculated = calculateEventHash(envelope);
  return calculated === envelope.hash;
}

