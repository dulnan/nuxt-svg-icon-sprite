<template>
  <svg class="multiple-symbols aspect-square mx-auto" viewBox="0 0 1000 1000">
    <SpriteSymbol
      v-for="n in TOTAL"
      :key="n"
      name="silhouette"
      width="1000"
      height="1000"
      x="0"
      y="0"
      transform-origin="center"
      class="transition-all"
      style="transition-timing-function: linear; transition-duration: 500ms"
      :transform="getTransform(n)"
      :class="getClass(n)"
    />
  </svg>
</template>

<script lang="ts" setup>
import { onUnmounted, ref } from 'vue'
const TOTAL = 9

const offset = ref(0)

function getTransform(n: number) {
  const v = (TOTAL - ((n + offset.value) % TOTAL)) / 5
  return `scale(${v})`
}

const COLOR_CLASSES = [
  'fill-yellow-400',
  'fill-stone-800',
  'fill-blue-800',
  'fill-cyan-100',
  'fill-red-600',
  'fill-red-200',
]

function getClass(n: number) {
  const index = (n - 1 + offset.value) % COLOR_CLASSES.length
  return COLOR_CLASSES[index]
}

const interval = setInterval(() => {
  offset.value = offset.value + 1
}, 500)

onUnmounted(() => {
  clearInterval(interval)
})
</script>

<style type="postcss">
.multiple-symbols {
  width: calc(100vmin - 20rem);
}
</style>
