import { Redis } from '@upstash/redis';
import { AuditEnvelope } from './types';

export const AUDIT_STREAM_KEY = 'audit_events_stream';
export const AUDIT_DLQ_KEY = 'audit_events_dlq';
export const MAX_STREAM_LEN = 100000;

let _redis: Redis | null = null;

export function getAuditRedisClient(): Redis {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error('UPSTASH_REDIS_REST_URL ou UPSTASH_REDIS_REST_TOKEN não configurados.');
  }

  _redis = new Redis({ url, token });
  return _redis;
}

/**
 * Publica um envelope de auditoria no stream do Upstash Redis (Airbag buffer).
 * Aplica retenção aproximada MAXLEN ~ 100.000 para proteção de cota.
 */
export async function pushAuditEventToQueue(envelope: AuditEnvelope): Promise<string> {
  const redis = getAuditRedisClient();
  const payload = JSON.stringify(envelope);

  // XADD com MAXLEN ~ 100000
  const messageId = await redis.xadd(
    AUDIT_STREAM_KEY,
    '*',
    {
      _id: envelope._id,
      system: envelope.system,
      severity: envelope.severity,
      payload,
    },
    {
      trim: {
        type: 'MAXLEN',
        comparison: '~',
        threshold: MAX_STREAM_LEN,
      },
    }
  );

  return messageId;
}

