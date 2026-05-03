import { computed, ref, watch } from 'vue';

const STORAGE_KEY = 'irregular-app-progress:v1';

function createBlankEntry() {
  return {
    goodCount: 0,
    errorCount: 0,
    known: false,
    lastAttempt: null,
    streak: 0,
    lastResult: null,
  };
}

function sanitizeEntry(entry = {}) {
  return {
    goodCount: Number(entry.goodCount) || 0,
    errorCount: Number(entry.errorCount) || 0,
    known: Boolean(entry.known),
    lastAttempt: typeof entry.lastAttempt === 'string' ? entry.lastAttempt : null,
    streak: Number(entry.streak) || 0,
    lastResult:
      entry.lastResult === 'success' || entry.lastResult === 'error'
        ? entry.lastResult
        : null,
  };
}

function buildAttemptEntry(current, success, lastAttempt = new Date().toISOString()) {
  return {
    ...current,
    goodCount: success ? current.goodCount + 1 : current.goodCount,
    errorCount: success ? current.errorCount : current.errorCount + 1,
    known: success ? true : current.known,
    lastAttempt,
    streak: success ? current.streak + 1 : 0,
    lastResult: success ? 'success' : 'error',
  };
}

function readStorage() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue);

    if (!parsedValue || typeof parsedValue !== 'object') {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedValue).map(([verbId, entry]) => [verbId, sanitizeEntry(entry)]),
    );
  } catch {
    return {};
  }
}

export function useProgress(verbsRef) {
  const progress = ref(readStorage());
  const lastAttemptBases = {};

  watch(
    progress,
    (value) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        // Ignore storage write failures so the quiz remains usable.
      }
    },
    { deep: true },
  );

  watch(
    verbsRef,
    (verbs) => {
      if (!verbs.length) {
        return;
      }

      const nextProgress = { ...progress.value };
      let changed = false;

      verbs.forEach((verb) => {
        if (!nextProgress[verb.id]) {
          nextProgress[verb.id] = createBlankEntry();
          changed = true;
        }
      });

      if (changed) {
        progress.value = nextProgress;
      }
    },
    { immediate: true },
  );

  function getVerbProgress(verbId) {
    return sanitizeEntry(progress.value[verbId]);
  }

  function recordAttempt(verbId, { success }) {
    const current = getVerbProgress(verbId);
    const timestamp = new Date().toISOString();

    lastAttemptBases[verbId] = current;

    progress.value = {
      ...progress.value,
      [verbId]: buildAttemptEntry(current, success, timestamp),
    };
  }

  function forgiveLastMistake(verbId) {
    const baseEntry = lastAttemptBases[verbId];

    if (!baseEntry) {
      return;
    }

    const current = getVerbProgress(verbId);

    if (current.lastResult !== 'error') {
      return;
    }

    progress.value = {
      ...progress.value,
      [verbId]: buildAttemptEntry(baseEntry, true, current.lastAttempt ?? new Date().toISOString()),
    };
  }

  function resetProgress() {
    const nextProgress = {};

    verbsRef.value.forEach((verb) => {
      nextProgress[verb.id] = createBlankEntry();
    });

    progress.value = nextProgress;
  }

  const stats = computed(() => {
    const total = verbsRef.value.length;
    const known = verbsRef.value.filter((verb) => getVerbProgress(verb.id).known).length;
    const unknown = Math.max(total - known, 0);
    const percent = total ? Math.round((known / total) * 100) : 0;

    return {
      total,
      known,
      unknown,
      percent,
    };
  });

  return {
    progress,
    stats,
    getVerbProgress,
    recordAttempt,
    forgiveLastMistake,
    resetProgress,
  };
}
