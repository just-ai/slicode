<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  codeMetrics: { type: String, default: '' },
})

// Parse "lines:chars,lines:chars,..." into array
const metrics = computed(() =>
  props.codeMetrics
    ? props.codeMetrics.split(',').map((s) => {
        const [l, c] = s.split(':').map(Number)
        return { lines: l || 0, chars: c || 0 }
      })
    : []
)

const slideEl = ref(null)
const rightCol = ref(null)
const fontSize = ref(16)

let debounceTimer = null
let fallbackTimer = null
let observer = null
let availW = 0
let availH = 0

function measure() {
  if (!slideEl.value) return
  const w = slideEl.value.clientWidth
  const h = slideEl.value.clientHeight
  if (w > 0 && h > 0) {
    const hasTerminal = rightCol.value?.querySelector('.terminal-window')
    availW = w / 2 - 48 - (hasTerminal ? 32 : 0)
    availH = h
  }
}

function computeSize(idx) {
  if (availW <= 0 || availH <= 0) return 16
  const m = metrics.value[idx]
  if (!m || (m.lines === 0 && m.chars === 0)) return 16
  const byHeight = m.lines > 0 ? availH / (m.lines * 1.5) : 20
  const byWidth = m.chars > 0 ? availW / (m.chars * 0.6) : 20
  return Math.max(10, Math.min(20, byHeight, byWidth))
}

function applyFontSize() {
  const click = parseInt(rightCol.value?.dataset.click || '0')
  fontSize.value = computeSize(Math.min(click, metrics.value.length - 1))
}

function onTransitionEnd(e) {
  if (e.target === rightCol.value) return
  clearTimeout(fallbackTimer)
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(applyFontSize, 50)
}

function onMutation() {
  clearTimeout(fallbackTimer)
  fallbackTimer = setTimeout(applyFontSize, 800)
}

onMounted(async () => {
  measure()
  // If not laid out yet, retry after paint
  if (availW <= 0 || availH <= 0) {
    await nextTick()
    requestAnimationFrame(() => {
      measure()
      fontSize.value = computeSize(0)
    })
  } else {
    fontSize.value = computeSize(0)
  }

  rightCol.value?.addEventListener('transitionend', onTransitionEnd)
  observer = new MutationObserver(onMutation)
  if (rightCol.value) {
    observer.observe(rightCol.value, { childList: true, subtree: true, characterData: true })
  }
})

onUnmounted(() => {
  rightCol.value?.removeEventListener('transitionend', onTransitionEnd)
  if (observer) observer.disconnect()
  clearTimeout(debounceTimer)
  clearTimeout(fallbackTimer)
})
</script>

<template>
  <div ref="slideEl" class="slidev-layout two-cols-drawer">
    <div class="left-column">
      <slot />
    </div>
    <div ref="rightCol" class="right-column"
      :data-click="$clicks"
      :style="{ '--code-font-size': fontSize + 'px' }">
      <slot name="right" />
    </div>
  </div>
</template>

<style scoped>
.two-cols-drawer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.left-column {
  position: relative;
  padding: 0;
  overflow: hidden;
}

.left-column :deep(.slide-heading) {
  position: absolute;
  top: 0;
  left: 0;
  padding: 0.6rem 0.8rem;
  z-index: 1;
}

.left-column :deep(.slide-text) {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 3rem;
  view-transition-name: slide-text;
}

.left-column :deep(.slide-heading h1),
.left-column :deep(.slide-heading h2),
.left-column :deep(.slide-heading h3),
.left-column :deep(.slide-heading h4),
.left-column :deep(.slide-heading h5),
.left-column :deep(.slide-heading h6) {
  font-family: var(--font-heading);
  color: var(--slicode-accent);
  margin: 0;
  view-transition-name: slide-heading;
}

.left-column :deep(.slide-heading h1) { font-size: 2em; font-weight: var(--h1-weight, 700); }
.left-column :deep(.slide-heading h2) { font-size: 1em; font-weight: var(--h2-weight, 600); opacity: 0.8; }
.left-column :deep(.slide-heading h3) { font-size: 0.9em; font-weight: var(--h3-weight, 600); opacity: 0.8; }
.left-column :deep(.slide-heading h4) { font-size: 0.85em; font-weight: var(--h4-weight, 600); opacity: 0.7; }
.left-column :deep(.slide-heading h5) { font-size: 0.8em; font-weight: var(--h5-weight, 500); opacity: 0.7; }
.left-column :deep(.slide-heading h6) { font-size: 0.75em; font-weight: var(--h6-weight, 500); opacity: 0.7; }

.left-column :deep(.slide-text p),
.left-column :deep(.slide-text ul),
.left-column :deep(.slide-text ol),
.left-column :deep(.slide-text blockquote),
.left-column :deep(.slide-text table) {
  font-size: 1.25em;
  color: var(--slicode-text-secondary);
  margin: 0.3em 0;
}

.left-column :deep(.slide-text ul),
.left-column :deep(.slide-text ol) {
  padding-left: 1.5em;
  text-align: left;
}

.right-column {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding: 0 1.5rem;
  overflow: hidden;
  background: linear-gradient(160deg, var(--slicode-right-bg-from) 0%, var(--slicode-right-bg-to) 100%);
  view-transition-name: right-drawer;
  font-size: var(--code-font-size, 16px);
}

/* Code block styling — transparent bg, no extra padding (column has the padding) */
.right-column :deep(.slidev-code-wrapper),
.right-column :deep(pre),
.right-column :deep(.shiki),
.right-column :deep(.slidev-code) {
  background: transparent !important;
  max-width: 100% !important;
  width: 100% !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  overflow-x: auto !important;
  box-sizing: border-box !important;
}

.right-column :deep(.shiki) {
  font-family: var(--font-code) !important;
  font-size: inherit !important;
}

.right-column :deep(.right-image) {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 6px;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
