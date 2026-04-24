<script setup>
defineProps({
  modes: {
    type: Array,
    default: () => [],
  },
  totalVerbs: {
    type: Number,
    default: 0,
  },
});

defineEmits(['select']);
</script>

<template>
  <section class="card mode-card">
    <div class="section-heading">
      <span class="eyebrow">Choisir un mode</span>
      <h2>On démarre avec {{ totalVerbs }} verbes</h2>
      <p>
        Choisis une direction de travail, puis l’application enchaîne immédiatement les cartes dans
        un ordre mélangé.
      </p>
    </div>

    <div class="mode-grid">
      <button
        v-for="mode in modes"
        :key="mode.id"
        class="mode-button"
        type="button"
        @click="$emit('select', mode.id)"
      >
        <span class="mode-title">{{ mode.title }}</span>
        <span class="mode-description">{{ mode.description }}</span>
        <span class="mode-hint">{{ mode.hint }}</span>
      </button>
    </div>
  </section>
</template>

