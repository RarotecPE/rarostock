import { AuditEnvelope } from './types';

/**
 * Normaliza uma string para busca insensível a acentos e maiúsculas/minúsculas.
 * Ex: "João Açúcar" -> "joao acucar"
 */
export function normalizeToken(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Divide um texto em tokens pesquisáveis por índice B-Tree (prefixo/exato).
 * Divide por espaços, pontuações e caracteres especiais comuns.
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];

  const normalized = normalizeToken(text);
  const words = normalized
    .split(/[\s,.;:/\\-_+()\[\]{}'"]+/)
    .filter((token) => token.length >= 2);

  return Array.from(new Set(words));
}

/**
 * Extrai todos os tokens de busca de um envelope canônico de auditoria.
 * Inclui:
 * - Atores (id, email, nome)
 * - Alvos (id, label, type)
 * - Ação e categoria
 * - Campos-chave de detalhes (se string/number)
 */
export function extractSearchTokens(
  envelope: Pick<AuditEnvelope, 'actor' | 'targets' | 'action' | 'category' | 'details' | 'system'>
): string[] {
  const tokensSet = new Set<string>();

  const add = (val?: string | number | null) => {
    if (val === null || val === undefined) return;
    const tokens = tokenizeText(String(val));
    for (const t of tokens) {
      tokensSet.add(t);
    }
  };

  // Metadados principais
  add(envelope.system);
  add(envelope.category);
  add(envelope.action);

  // Ator
  if (envelope.actor) {
    add(envelope.actor.userId);
    add(envelope.actor.email);
    add(envelope.actor.name);
    add(envelope.actor.role);
  }

  // Alvos
  if (envelope.targets && Array.isArray(envelope.targets)) {
    for (const target of envelope.targets) {
      add(target.type);
      add(target.id);
      add(target.label);
    }
  }

  // Detalhes de primeiro nível relevantes
  if (envelope.details && typeof envelope.details === 'object') {
    for (const [key, value] of Object.entries(envelope.details)) {
      if (typeof value === 'string' || typeof value === 'number') {
        add(key);
        add(value);
      }
    }
  }

  return Array.from(tokensSet);
}

