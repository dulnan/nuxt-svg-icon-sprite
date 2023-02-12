<template>
  <use v-if="noWrapper && ctx.name" :xlink:href="href" />
  <svg v-else-if="ctx.name">
    <use :xlink:href="href" />
  </svg>
</template>

<script lang="ts" setup>
import { computed, PropType } from 'vue'
import type { NuxtSvgSpriteSymbol } from '#nuxt-svg-sprite/runtime'
import { SPRITE_PATHS } from '#nuxt-svg-sprite/runtime'

const props = defineProps({
  name: String as PropType<NuxtSvgSpriteSymbol>,
  noWrapper: Boolean,
})

const ctx = computed(() => {
  const [sprite, name] = (props.name || '').split('/')
  if (!name) {
    return {
      sprite: 'default',
      name: sprite,
    }
  }

  return { sprite, name }
})

const href = computed(() => {
  return SPRITE_PATHS[ctx.value.sprite] + '#' + ctx.value.name
})
</script>
