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

const emit = defineEmits(['resolved', 'forgive-typo', 'next', 'change-mode']);

const answers = reactive({});
const inputRefs = {};
const isAnswerPreviewVisible = ref(false);
const isTypoForgiven = ref(false);
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
const isForgivenMistake = computed(() => Boolean(result.value && !result.value.success && isTypoForgiven.value));
const resultBannerClass = computed(() => {
  if (!result.value) {
    return 'result-banner--preview';
  }

  if (result.value.success) {
    return 'result-banner--success celebrate';
  }

  if (isForgivenMistake.value) {
    return 'result-banner--forgiven';
  }

  return 'result-banner--error soft-shake';
});
const resultBannerTitle = computed(() => {
  if (!result.value) {
    return 'Réponse affichée.';
  }

  if (result.value.success) {
    return 'Parfait, réponse validée.';
  }

  if (isForgivenMistake.value) {
    return 'Faute de frappe ignorée.';
  }

  return 'On corrige doucement.';
});
const resultBannerMessage = computed(() => {
  if (!result.value) {
    return 'Les réponses attendues sont mises en évidence sous chaque champ.';
  }

  if (result.value.success) {
    return 'Ce verbe reculera dans la file pour laisser la place à ceux à renforcer.';
  }

  if (isForgivenMistake.value) {
    return 'Cette tentative est maintenant comptée comme juste, même si la correction reste affichée.';
  }

  return 'Les corrections sont affichées sous les champs à reprendre.';
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
  isAnswerPreviewVisible.value = false;
  isTypoForgiven.value = false;
  result.value = null;

  Object.keys(answers).forEach((key) => {
    delete answers[key];
  });

  props.exercise.fields.forEach((field) => {
    answers[field.key] = field.initialValue ?? '';
  });

  focusFirstPendingField();
}

function applyEvaluation() {
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

  const success = editableFields.value.every((field) => fieldResults[field.key]?.correct);

  result.value = {
    success,
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

  isAnswerPreviewVisible.value = false;
  applyEvaluation();
}

function toggleAnswerPreview() {
  if (result.value) {
    return;
  }

  isAnswerPreviewVisible.value = !isAnswerPreviewVisible.value;
}

function handleForgiveTypo() {
  if (!result.value || result.value.success || isTypoForgiven.value) {
    return;
  }

  isTypoForgiven.value = true;
  emit('forgive-typo', {
    verbId: props.exercise.verb.id,
  });
}

function shouldTogglePreviewWithSpace(event) {
  if (event.code !== 'Space' || event.ctrlKey || event.altKey || event.metaKey) {
    return false;
  }

  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return true;
  }

  if (target.tagName === 'INPUT') {
    return target.dataset.fieldKind !== 'translation';
  }

  if (target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
    return false;
  }

  return true;
}

function handleGlobalKeydown(event) {
  if (event.repeat) {
    return;
  }

  if (shouldTogglePreviewWithSpace(event)) {
    event.preventDefault();
    toggleAnswerPreview();
    return;
  }

  const isRevealShortcut = event.key === '?';

  if (isRevealShortcut && !result.value) {
    event.preventDefault();
    toggleAnswerPreview();
  }
}

function getShellStateClass(field) {
  if (field.locked) {
    return 'is-locked';
  }

  if (isAnswerPreviewVisible.value && !result.value) {
    return 'is-preview';
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

  if (!result.value && !isAnswerPreviewVisible.value) {
    if (field.kind === 'translation') {
      return 'Une traduction seule ou la chaîne complète sont acceptées.';
    }

    if (field.answer.includes('/')) {
      return 'Une variante seule ou la chaîne complète sont acceptées.';
    }

    return ' ';
  }

  if (isAnswerPreviewVisible.value && !result.value) {
    return 'Réponse affichée ci-dessous.';
  }

  const fieldResult = result.value.fieldResults[field.key];

  if (fieldResult.correct) {
    return 'Juste.';
  }

  return 'Compare avec la correction ci-dessous.';
}

function shouldShowAnswerReveal(field) {
  if (field.locked) {
    return false;
  }

  if (isAnswerPreviewVisible.value && !result.value) {
    return true;
  }

  if (!result.value) {
    return false;
  }

  return !result.value.fieldResults[field.key]?.correct;
}

function getAnswerRevealLabel(field) {
  if (isAnswerPreviewVisible.value && !result.value) {
    return 'Réponse attendue';
  }

  return 'Correction';
}

function getAnswerRevealValue(field) {
  return result.value?.fieldResults[field.key]?.expected ?? field.answer;
}

function getProvidedAnswer(field) {
  const provided = result.value?.fieldResults[field.key]?.provided;

  if (!provided || !String(provided).trim()) {
    return '';
  }

  return String(provided).trim();
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
        Indice : {{ exercise.revealedField.label }}
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
            :data-field-kind="field.kind"
            autocomplete="off"
            autocapitalize="none"
            spellcheck="false"
            @keydown.enter.prevent.stop="handleSubmit"
          />

          <div v-else class="field-display">
            {{ field.answer }}
          </div>

          <span class="field-feedback">{{ getFieldFeedback(field) }}</span>

          <div
            v-if="shouldShowAnswerReveal(field)"
            class="answer-reveal"
            :class="isAnswerPreviewVisible && !result ? 'answer-reveal--preview' : 'answer-reveal--correction'"
          >
            <span class="answer-reveal-label">{{ getAnswerRevealLabel(field) }}</span>
            <strong class="answer-reveal-value">{{ getAnswerRevealValue(field) }}</strong>
            <span
              v-if="result && getProvidedAnswer(field)"
              class="answer-reveal-meta"
            >
              Ta saisie : {{ getProvidedAnswer(field) }}
            </span>
          </div>
        </label>
      </div>

      <div
        v-if="result || isAnswerPreviewVisible"
        class="result-banner"
        :class="resultBannerClass"
      >
        <strong>{{ resultBannerTitle }}</strong>
        <span>{{ resultBannerMessage }}</span>
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
          @click="toggleAnswerPreview"
        >
          {{ isAnswerPreviewVisible ? 'Masquer la réponse' : 'Voir la réponse' }}
        </button>

        <button
          v-if="result"
          ref="nextButtonRef"
          class="primary-button"
          type="button"
          @click="$emit('next')"
          @keydown.enter.prevent.stop="$emit('next')"
        >
          Suivant
        </button>

        <button
          v-if="result && !result.success"
          class="ghost-button ghost-button--warm"
          type="button"
          :disabled="isTypoForgiven"
          @click="handleForgiveTypo"
        >
          {{ isTypoForgiven ? 'Compté comme faute de frappe' : "j'avais raison" }}
        </button>

        <button class="ghost-button" type="button" @click="$emit('change-mode')">
          Changer de mode
        </button>

        <span class="shortcut-text">
          {{
            result
              ? 'Entrée pour continuer'
              : 'Entrée pour valider, Espace pour révéler ou masquer'
          }}
        </span>
      </div>
    </form>
  </article>
</template>
