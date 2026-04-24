<script setup>
defineProps({
  stats: {
    type: Object,
    required: true,
  },
  currentMode: {
    type: Object,
    default: null,
  },
});

defineEmits(['change-mode', 'reset']);
</script>

<template>
  <aside class="card progress-card">
    <div class="section-heading">
      <span class="eyebrow">Progression locale</span>
      <h2>{{ stats.known }} / {{ stats.total }} verbes connus</h2>
      <p>
        {{
          currentMode
            ? `Mode actuel : ${currentMode.title}`
            : 'Aucun mode actif pour le moment.'
        }}
      </p>
    </div>

    <div class="bar" aria-hidden="true">
      <div class="bar-fill" :style="{ width: `${stats.percent}%` }"></div>
    </div>

    <div class="progress-grid">
      <div class="stat-box">
        <span class="stat-label">Total</span>
        <strong>{{ stats.total }}</strong>
      </div>
      <div class="stat-box">
        <span class="stat-label">Connus</span>
        <strong>{{ stats.known }}</strong>
      </div>
      <div class="stat-box">
        <span class="stat-label">À revoir</span>
        <strong>{{ stats.unknown }}</strong>
      </div>
      <div class="stat-box">
        <span class="stat-label">Progression</span>
        <strong>{{ stats.percent }}%</strong>
      </div>
    </div>

    <div class="action-row">
      <button class="ghost-button" type="button" :disabled="!currentMode" @click="$emit('change-mode')">
        Changer de mode
      </button>
      <button class="danger-button" type="button" @click="$emit('reset')">
        Reset progression
      </button>
    </div>

    <p class="helper-text">Sauvegarde automatique dans le navigateur avec `localStorage`.</p>
  </aside>
</template>

