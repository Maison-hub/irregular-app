<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { isAcceptedAnswer } from '../utils/normalize';

const props = defineProps({
  exercise: {
    type: Object,
    required: true,
  },
  mode: {
    type: Object,
    default: null,
  },
  verbProgress: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['resolved', 'next', 'change-mode']);

const answers = reactive({});
const inputRefs = {};
const result = ref(null);
const nextButtonRef = ref(null);

const editableFields = computed(() => props.exercise.fields.filter((field) => !field.locked));
const isComplete = computed(() =>
  editableFields.value.every((field) => String(answers[field.key] ?? '').trim().length > 0),
);
const cardStateClass = computed(() => {
  if (!result.value) {
    return '';
  }

  return result.value.success ? 'is-success' : 'is-error';
});
const memoryHint = computed(() =>
  props.verbProgress?.known
    ? 'Ce verbe est déjà marqué comme connu.'
    : 'Ce verbe n’est pas encore validé sans faute.',
);
const lastAttemptLabel = computed(() => {
  const rawDate = props.verbProgress?.lastAttempt;

  if (!rawDate) {
    return 'Jamais tenté';
  }

  const date = new Date(rawDate);

  if (Number.isNaN(date.getTime())) {
    return 'Dernière tentative inconnue';
  }

  return `Dernière tentative : ${date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })}`;
});

function setInputRef(key, element) {
  if (element) {
    inputRefs[key] = element;
    return;
  }

  delete inputRefs[key];
}

function focusFirstPendingField() {
  const targetField =
    editableFields.value.find((field) => !String(answers[field.key] ?? '').trim()) ??
    editableFields.value[0];

  if (!targetField) {
    return;
  }

  nextTick(() => {
    inputRefs[targetField.key]?.focus();
    inputRefs[targetField.key]?.select?.();
  });
}

function resetForm() {
  result.value = null;

  Object.keys(answers).forEach((key) => {
    delete answers[key];
  });

  props.exercise.fields.forEach((field) => {
    answers[field.key] = field.initialValue ?? '';
  });

  focusFirstPendingField();
}

function applyEvaluation(revealed = false) {
  const fieldResults = Object.fromEntries(
    props.exercise.fields.map((field) => {
      if (field.locked) {
        return [
          field.key,
          {
            correct: true,
            provided: field.answer,
            expected: field.answer,
          },
        ];
      }

      const provided = answers[field.key] ?? '';
      const correct = isAcceptedAnswer(provided, field.answer);

      return [
        field.key,
        {
          correct,
          provided,
          expected: field.answer,
        },
      ];
    }),
  );

  const success =
    !revealed && editableFields.value.every((field) => fieldResults[field.key]?.correct);

  result.value = {
    success,
    revealed,
    fieldResults,
  };

  emit('resolved', {
    verbId: props.exercise.verb.id,
    success,
  });
}

function handleSubmit() {
  if (result.value) {
    emit('next');
    return;
  }

  if (!isComplete.value) {
    focusFirstPendingField();
    return;
  }

  applyEvaluation(false);
}

function revealAnswer() {
  if (result.value) {
    return;
  }

  applyEvaluation(true);
}

function handleGlobalKeydown(event) {
  if (event.repeat) {
    return;
  }

  if (event.key === 'Enter' && result.value) {
    event.preventDefault();
    emit('next');
    return;
  }

  const isRevealShortcut = event.key === '?' || (event.ctrlKey && event.code === 'Space');

  if (isRevealShortcut && !result.value) {
    event.preventDefault();
    revealAnswer();
  }
}

function getShellStateClass(field) {
  if (field.locked) {
    return 'is-locked';
  }

  if (!result.value) {
    return '';
  }

  return result.value.fieldResults[field.key]?.correct ? 'is-correct' : 'is-wrong';
}

function getInputStateClass(field) {
  if (!result.value) {
    return '';
  }

  return result.value.fieldResults[field.key]?.correct ? 'is-correct' : 'is-wrong';
}

function getFieldFeedback(field) {
  if (field.locked) {
    return 'Forme donnée pour cette manche.';
  }

  if (!result.value) {
    if (field.kind === 'translation') {
      return 'Une traduction seule ou la chaîne complète sont acceptées.';
    }

    if (field.answer.includes('/')) {
      return 'Une variante seule ou la chaîne complète sont acceptées.';
    }

    return ' ';
  }

  const fieldResult = result.value.fieldResults[field.key];

  if (fieldResult.correct) {
    return result.value.revealed ? 'Ta réponse était déjà bonne.' : 'Juste.';
  }

  return `Bonne réponse : ${field.answer}`;
}

watch(
  () => props.exercise.key,
  () => {
    resetForm();
  },
  { immediate: true },
);

watch(result, (value) => {
  if (value) {
    nextTick(() => nextButtonRef.value?.focus());
  }
});

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <article class="card quiz-card" :class="cardStateClass">
    <div class="quiz-top">
      <div class="section-heading">
        <span class="eyebrow">{{ mode?.title }}</span>
        <h2>
          {{
            exercise.modeId === 'fr-to-en'
              ? 'Complète les trois formes anglaises'
              : 'Complète la fiche du verbe'
          }}
        </h2>
        <p>{{ mode?.description }}</p>
      </div>

      <div class="status-strip">
        <span class="status-badge" :class="verbProgress?.known ? 'status-badge--success' : 'status-badge--warning'">
          {{ verbProgress?.known ? 'Connu' : 'En apprentissage' }}
        </span>
        <span class="status-badge status-badge--ghost">{{ memoryHint }}</span>
        <span class="status-badge status-badge--ghost">{{ lastAttemptLabel }}</span>
      </div>
    </div>

    <div class="prompt-card">
      <span class="prompt-label">{{ exercise.promptTitle }}</span>
      <strong class="prompt-value">{{ exercise.promptValue }}</strong>
      <span v-if="exercise.revealedField" class="reveal-chip">
        {{ exercise.revealedField.label }} donné
      </span>
    </div>

    <form class="quiz-form" @submit.prevent="handleSubmit">
      <div class="field-grid">
        <label
          v-for="field in exercise.fields"
          :key="field.key"
          class="input-shell"
          :class="getShellStateClass(field)"
        >
          <span class="input-label">{{ field.label }}</span>

          <input
            v-if="!field.locked"
            :ref="(element) => setInputRef(field.key, element)"
            v-model="answers[field.key]"
            class="field-input"
            :class="getInputStateClass(field)"
            :disabled="Boolean(result)"
            :placeholder="field.kind === 'translation' ? 'Ta traduction' : 'Ta réponse'"
            autocomplete="off"
            autocapitalize="none"
            spellcheck="false"
            @keydown.enter.prevent="handleSubmit"
          />

          <div v-else class="field-display">
            {{ field.answer }}
          </div>

          <span class="field-feedback">{{ getFieldFeedback(field) }}</span>
        </label>
      </div>

      <div v-if="result" class="result-banner" :class="result.success ? 'result-banner--success celebrate' : 'result-banner--error soft-shake'">
        <strong>
          {{
            result.success
              ? 'Parfait, réponse validée.'
              : result.revealed
                ? 'Réponse affichée.'
                : 'On corrige doucement.'
          }}
        </strong>
        <span>
          {{
            result.success
              ? 'Ce verbe reculera dans la file pour laisser la place à ceux à renforcer.'
              : 'Les bonnes réponses restent visibles pour aider la mémorisation.'
          }}
        </span>
      </div>

      <div class="footer-actions">
        <button
          v-if="!result"
          class="primary-button"
          type="submit"
          :disabled="!isComplete"
        >
          Valider
        </button>

        <button
          v-if="!result"
          class="ghost-button"
          type="button"
          @click="revealAnswer"
        >
          Voir la réponse
        </button>

        <button
          v-if="result"
          ref="nextButtonRef"
          class="primary-button"
          type="button"
          @click="$emit('next')"
        >
          Suivant
        </button>

        <button class="ghost-button" type="button" @click="$emit('change-mode')">
          Changer de mode
        </button>

        <span class="shortcut-text">
          {{
            result
              ? 'Entrée pour continuer'
              : 'Entrée pour valider, Ctrl + Espace ou ? pour révéler'
          }}
        </span>
      </div>
    </form>
  </article>
</template>

