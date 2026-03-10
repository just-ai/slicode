<template>
  <div class="slidev-layout centered-layout">
    <div class="content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.centered-layout {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
}

.content {
  text-align: center;
  max-width: 80%;
}

.content :deep(h1),
.content :deep(h2),
.content :deep(h3),
.content :deep(h4),
.content :deep(h5),
.content :deep(h6) {
  font-family: var(--font-heading);
  margin-bottom: 0.5em;
  color: var(--slicode-accent);
  view-transition-name: slide-heading;
}

.content :deep(h1) { font-size: 2.8em; font-weight: var(--h1-weight, 700); }
.content :deep(h2) { font-size: 2.2em; font-weight: var(--h2-weight, 600); }
.content :deep(h3) { font-size: 1.8em; font-weight: var(--h3-weight, 600); }
.content :deep(h4) { font-size: 1.5em; font-weight: var(--h4-weight, 600); }
.content :deep(h5) { font-size: 1.3em; font-weight: var(--h5-weight, 500); }
.content :deep(h6) { font-size: 1.1em; font-weight: var(--h6-weight, 500); }

.content :deep(p) {
  font-size: 1.5em;
  color: var(--slicode-text-secondary);
  view-transition-name: slide-text;
}
</style>
