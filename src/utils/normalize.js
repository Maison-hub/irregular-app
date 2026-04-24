const DIACRITICS_REGEX = /[\u0300-\u036f]/g;

function cleanSpacing(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function expandParenthesisVariants(value) {
  const trimmed = cleanSpacing(value);

  if (!trimmed) {
    return [];
  }

  if (!/[()]/.test(trimmed)) {
    return [trimmed];
  }

  const variants = new Set([
    trimmed,
    cleanSpacing(trimmed.replace(/[()]/g, ' ')),
    cleanSpacing(trimmed.replace(/\([^)]*\)/g, ' ')),
  ]);

  return [...variants].filter(Boolean);
}

function expandSlashVariants(value) {
  const trimmed = cleanSpacing(value);

  if (!trimmed) {
    return [];
  }

  const segments = trimmed.split('/').map((part) => cleanSpacing(part)).filter(Boolean);
  const variants = new Set([trimmed, cleanSpacing(trimmed.replace(/\//g, ' '))]);

  if (segments.length > 1) {
    segments.forEach((segment) => variants.add(segment));
  }

  return [...variants].filter(Boolean);
}

export function normalizeText(value = '') {
  return cleanSpacing(
    String(value)
      .normalize('NFD')
      .replace(DIACRITICS_REGEX, '')
      .replace(/[’'`´]/g, ' ')
      .replace(/[()]/g, ' ')
      .replace(/&/g, ' et ')
      .replace(/[.,!?;:]/g, ' ')
      .replace(/[-_]+/g, ' '),
  ).toLowerCase();
}

export function buildAcceptedAnswers(expected = '') {
  const variants = new Set();

  expandParenthesisVariants(expected).forEach((parenthesisVariant) => {
    expandSlashVariants(parenthesisVariant).forEach((slashVariant) => {
      const normalized = normalizeText(slashVariant);

      if (normalized) {
        variants.add(normalized);
      }
    });
  });

  return variants;
}

export function isAcceptedAnswer(input = '', expected = '') {
  const normalizedInput = normalizeText(input);

  if (!normalizedInput) {
    return false;
  }

  return buildAcceptedAnswers(expected).has(normalizedInput);
}
