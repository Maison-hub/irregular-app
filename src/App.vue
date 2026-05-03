<script setup>
import { computed, onMounted } from 'vue';
import ModeSelector from './components/ModeSelector.vue';
import ProgressPanel from './components/ProgressPanel.vue';
import QuizCard from './components/QuizCard.vue';
import { useCsvVerbs } from './composables/useCsvVerbs';
import { useProgress } from './composables/useProgress';
import { QUIZ_MODES, useQuiz } from './composables/useQuiz';

const { verbs, isLoading, error, loadVerbs } = useCsvVerbs();
const { stats, getVerbProgress, recordAttempt, forgiveLastMistake, resetProgress } =
  useProgress(verbs);
const { mode, currentMode, currentExercise, nextExercise, startMode, clearMode } = useQuiz(
  verbs,
  getVerbProgress,
);

const currentVerbProgress = computed(() =>
  currentExercise.value ? getVerbProgress(currentExercise.value.verb.id) : null,
);

function handleResolved({ verbId, success }) {
  recordAttempt(verbId, { success });
}

function handleForgiveTypo({ verbId }) {
  forgiveLastMistake(verbId);
}

function handleResetProgress() {
  const confirmed = window.confirm(
    'Réinitialiser toute la progression locale ? Cette action effacera les verbes connus et l’historique des tentatives.',
  );

  if (!confirmed) {
    return;
  }

  resetProgress();

  if (mode.value) {
    nextExercise();
  }
}

onMounted(() => {
  loadVerbs();
});
</script>

<template>
  <div class="app-shell">
    <header class="card hero-card">
      <div class="hero-copy">
        <span class="eyebrow">Irregular Verbs Trainer</span>
        <h1>Révise les verbes irréguliers rapidement.</h1>
        <p>Entraînement local avec correction immédiate et progression sauvegardée.</p>
      </div>

      <div class="hero-pills">
        <span class="hero-pill">Vue 3 + Vite</span>
        <span class="hero-pill">Sans backend</span>
        <span class="hero-pill">Feedback immédiat</span>
        <span class="hero-pill">Prête hors ligne</span>
      </div>
    </header>

    <div class="app-layout" :class="{ 'app-layout--quiz': currentExercise }">
      <main class="main-column">
        <section v-if="isLoading" class="card state-card">
          <div class="section-heading">
            <span class="eyebrow">Chargement</span>
            <h2>Préparation des verbes</h2>
            <p>Le fichier CSV local est en train d’être lu.</p>
          </div>
          <div class="loading-line"></div>
        </section>

        <section v-else-if="error" class="card state-card state-card--error">
          <div class="section-heading">
            <span class="eyebrow">Erreur</span>
            <h2>Impossible de charger le CSV</h2>
            <p>{{ error }}</p>
          </div>

          <button class="primary-button" type="button" @click="loadVerbs">
            Réessayer
          </button>
        </section>

        <ModeSelector
          v-else-if="!mode"
          :modes="QUIZ_MODES"
          :total-verbs="stats.total"
          @select="startMode"
        />

        <QuizCard
          v-else-if="currentExercise"
          :exercise="currentExercise"
          :mode="currentMode"
          :verb-progress="currentVerbProgress"
          @resolved="handleResolved"
          @forgive-typo="handleForgiveTypo"
          @next="nextExercise"
          @change-mode="clearMode"
        />

        <section v-else class="card state-card">
          <div class="section-heading">
            <span class="eyebrow">Vide</span>
            <h2>Aucun verbe disponible</h2>
            <p>Vérifie le contenu de `public/irregular-verbs.csv`, puis recharge l’application.</p>
          </div>
        </section>
      </main>

      <aside class="side-column" :class="{ 'side-column--quiz': currentExercise }">
        <ProgressPanel
          :stats="stats"
          :current-mode="currentMode"
          @change-mode="clearMode"
          @reset="handleResetProgress"
        />

        <section class="card tips-card">
          <div class="section-heading">
            <span class="eyebrow">Raccourcis</span>
            <h2>Tout va plus vite au clavier</h2>
          </div>

          <ul class="tips-list">
            <li><kbd>Tab</kbd> pour passer d’un champ à l’autre</li>
            <li><kbd>Entrée</kbd> pour valider, puis encore <kbd>Entrée</kbd> pour continuer</li>
            <li><kbd>Espace</kbd> pour voir ou masquer la réponse</li>
          </ul>
        </section>

        <section class="card tips-card">
          <div class="section-heading">
            <span class="eyebrow">Hors ligne</span>
            <h2>Une fois chargée, l’app reste disponible</h2>
            <p>
              L’interface et le CSV sont mis en cache localement pour continuer à réviser sans
              backend après le premier chargement réussi.
            </p>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>
