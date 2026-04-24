import { ref } from 'vue';

function parseCsvLine(line) {
  const parts = line.split(';');

  if (parts.length < 4) {
    return null;
  }

  const [infinitive, preterit, participle, ...translationParts] = parts.map((part) => part.trim());
  const translation = translationParts.join(';').trim();

  if (!infinitive || !preterit || !participle || !translation) {
    return null;
  }

  return {
    id: `${infinitive}-${preterit}-${participle}`.toLowerCase(),
    infinitive,
    preterit,
    participle,
    translation,
  };
}

function parseVerbsCsv(csvText) {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  return lines.slice(1).map(parseCsvLine).filter(Boolean);
}

export function useCsvVerbs(csvPath = `${import.meta.env.BASE_URL}irregular-verbs.csv`) {
  const verbs = ref([]);
  const isLoading = ref(false);
  const error = ref('');

  async function loadVerbs() {
    isLoading.value = true;
    error.value = '';

    try {
      const response = await fetch(csvPath);

      if (!response.ok) {
        throw new Error(`Impossible de charger le CSV (${response.status}).`);
      }

      verbs.value = parseVerbsCsv(await response.text());
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erreur inconnue pendant le chargement.';
      verbs.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  return {
    verbs,
    isLoading,
    error,
    loadVerbs,
  };
}

