import { randomBytes } from 'crypto';

/**
 * Gera um UUIDv7 estritamente ordenável por tempo (Time-Ordered UUID).
 * Estrutura de 128 bits:
 * - 48 bits: timestamp UNIX em milissegundos
 * - 4 bits: versão (0111 = 7)
 * - 12 bits: contador sequencial / entropia
 * - 2 bits: variante RFC 4122 (10)
 * - 62 bits: entropia pseudo-aleatória criptográfica
 */
let lastMillis = 0;
let seq = 0;

export function generateUUIDv7(): string {
  let now = Date.now();

  if (now === lastMillis) {
    seq = (seq + 1) & 0x0fff;
    if (seq === 0) {
      // Contador estourou no mesmo ms, aguarda o próximo milissegundo
      while (now <= lastMillis) {
        now = Date.now();
      }
    }
  } else {
    lastMillis = now;
    seq = Math.floor(Math.random() * 0x100);
  }

  const bytes = Buffer.alloc(16);

  // 48 bits de timestamp
  bytes[0] = (now / 0x10000000000) & 0xff;
  bytes[1] = (now / 0x100000000) & 0xff;
  bytes[2] = (now / 0x1000000) & 0xff;
  bytes[3] = (now / 0x10000) & 0xff;
  bytes[4] = (now / 0x100) & 0xff;
  bytes[5] = now & 0xff;

  // 4 bits de versão (7) + 12 bits seq
  const verAndSeq = 0x7000 | (seq & 0x0fff);
  bytes[6] = (verAndSeq >> 8) & 0xff;
  bytes[7] = verAndSeq & 0xff;

  // 8 bytes aleatórios adicionais
  const randomPart = randomBytes(8);
  randomPart.copy(bytes, 8);

  // 2 bits de variante RFC (0b10xxxxxx)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

