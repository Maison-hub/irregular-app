import { computed, ref } from 'vue';
import { normalizeText } from '../utils/normalize';

const ENGLISH_FIELDS = [
  { key: 'infinitive', label: 'Infinitif', kind: 'english' },
  { key: 'preterit', label: 'Prétérit', kind: 'english' },
  { key: 'participle', label: 'Participe passé', kind: 'english' },
];
const TRANSLATION_FIELD = {
  key: 'translation',
  label: 'Traduction',
  kind: 'translation',
};
const COMPLETE_FIELDS = [...ENGLISH_FIELDS, TRANSLATION_FIELD];

export const QUIZ_MODES = [
  {
    id: 'fr-to-en',
    title: 'Français → Anglais',
    description: 'La traduction française est donnée. Retrouve les trois formes anglaises.',
    hint: 'Parfait pour mémoriser le triplet complet.',
  },
  {
    id: 'en-to-complete',
    title: 'Anglais → Complet',
    description:
      'Une forme anglaise est révélée au hasard. Complète les deux autres formes et la traduction.',
    hint: 'Plus varié, idéal pour casser les automatismes.',
  },
  {
    id: 'random-to-complete',
    title: 'Aléatoire → Complet (mode examen)',
    description:
      'L’indice peut être une forme anglaise ou la traduction. Complète le reste de la fiche.',
    hint: 'Le mode le plus imprévisible pour vérifier la maîtrise globale.',
  },
];

const MODE_BY_ID = Object.fromEntries(QUIZ_MODES.map((mode) => [mode.id, mode]));

function pickRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function daysSince(lastAttempt) {
  if (!lastAttempt) {
    return 14;
  }

  const timestamp = new Date(lastAttempt).getTime();

  if (Number.isNaN(timestamp)) {
    return 0;
  }

  return Math.max((Date.now() - timestamp) / 86400000, 0);
}

function computeSelectionWeight(verb, getVerbProgress, recentIds, totalVerbs) {
  const progress = getVerbProgress(verb.id);
  const elapsedDays = daysSince(progress.lastAttempt);
  let weight = !progress.lastAttempt ? 16 : 1;

  if (progress.known) {
    weight += 1 + Math.min(elapsedDays, 10) * 0.8;
    weight += Math.max(progress.errorCount - progress.goodCount, 0) * 0.5;

    if (progress.streak >= 2) {
      weight *= 0.6;
    }
  } else {
    weight += 8;
    weight += Math.min(progress.errorCount, 5) * 2;
    weight += Math.min(elapsedDays, 6);

    if (progress.lastResult === 'error') {
      weight += 4;
    }
  }

  if (recentIds.includes(verb.id)) {
    weight *= totalVerbs > recentIds.length ? 0.08 : 0.4;
  }

  return Math.max(weight, 0.1);
}

function pickWeightedVerb(verbs, getVerbProgress, recentIds, previousVerbId) {
  const pool = verbs.filter((verb) => verbs.length === 1 || verb.id !== previousVerbId);
  const weightedPool = pool.map((verb) => ({
    verb,
    weight: computeSelectionWeight(verb, getVerbProgress, recentIds, pool.length),
  }));

  const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const item of weightedPool) {
    cursor -= item.weight;

    if (cursor <= 0) {
      return item.verb;
    }
  }

  return weightedPool[weightedPool.length - 1]?.verb ?? null;
}

function buildExerciseField(field, verb, revealedKey = null) {
  const answer = verb[field.key];
  const locked = field.key === revealedKey;

  return {
    ...field,
    answer,
    locked,
    initialValue: locked ? answer : '',
  };
}

function buildRevealSignature(field, verb) {
  return `${field.key}:${normalizeText(verb[field.key])}`;
}

function buildRevealCounts(verbs) {
  const counts = new Map();

  verbs.forEach((verb) => {
    COMPLETE_FIELDS.forEach((field) => {
      const signature = buildRevealSignature(field, verb);

      counts.set(signature, (counts.get(signature) ?? 0) + 1);
    });
  });

  return counts;
}

function pickRevealField(verb, revealPool, revealCounts) {
  // Only reveal a clue that uniquely identifies the verb in the current dataset.
  const uniqueFields = revealPool.filter(
    (field) => (revealCounts.get(buildRevealSignature(field, verb)) ?? 0) === 1,
  );

  return pickRandomItem(uniqueFields.length ? uniqueFields : revealPool);
}

function buildExercise(verb, modeId, revealCounts) {
  if (modeId === 'fr-to-en') {
    return {
      key: `${verb.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      verb,
      modeId,
      promptTitle: 'Traduction française',
      promptValue: verb.translation,
      revealedField: null,
      fields: ENGLISH_FIELDS.map((field) => buildExerciseField(field, verb)),
    };
  }

  const revealPool = modeId === 'random-to-complete' ? COMPLETE_FIELDS : ENGLISH_FIELDS;
  const revealedField = pickRevealField(verb, revealPool, revealCounts);
  const fields = COMPLETE_FIELDS.map((field) => buildExerciseField(field, verb, revealedField.key));

  return {
    key: `${verb.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    verb,
    modeId,
    promptTitle: 'Indice donné',
    promptValue: verb[revealedField.key],
    revealedField,
    fields,
  };
}

export function useQuiz(verbsRef, getVerbProgress) {
  const mode = ref(null);
  const currentExercise = ref(null);
  const recentIds = ref([]);
  const previousVerbId = ref(null);

  const currentMode = computed(() => MODE_BY_ID[mode.value] ?? null);

  function updateRecentIds(verbId) {
    const maxRecent = Math.min(10, Math.max(4, Math.ceil(verbsRef.value.length / 5)));

    recentIds.value = [verbId, ...recentIds.value.filter((id) => id !== verbId)].slice(0, maxRecent);
  }

  function nextExercise() {
    if (!verbsRef.value.length || !mode.value) {
      currentExercise.value = null;
      return;
    }

    const revealCounts = buildRevealCounts(verbsRef.value);

    const nextVerb = pickWeightedVerb(
      verbsRef.value,
      getVerbProgress,
      recentIds.value,
      previousVerbId.value,
    );

    if (!nextVerb) {
      currentExercise.value = null;
      return;
    }

    previousVerbId.value = nextVerb.id;
    updateRecentIds(nextVerb.id);
    currentExercise.value = buildExercise(nextVerb, mode.value, revealCounts);
  }

  function startMode(modeId) {
    mode.value = modeId;
    recentIds.value = [];
    previousVerbId.value = null;
    nextExercise();
  }

  function clearMode() {
    mode.value = null;
    currentExercise.value = null;
    recentIds.value = [];
    previousVerbId.value = null;
  }

  return {
    mode,
    currentMode,
    currentExercise,
    nextExercise,
    startMode,
    clearMode,
  };
}
