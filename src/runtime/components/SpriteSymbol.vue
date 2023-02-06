<template>
  <svg>
    <use :xlink:href="SPRITE_PATH + '#' + name" />
  </svg>
</template>

<script lang="ts" setup>
import type { PropType } from 'vue'
import type { NuxtSvgSpriteSymbol } from '#nuxt-svg-sprite'
import { SPRITE_PATH } from '#nuxt-svg-sprite'

defineProps({
  name: String as PropType<NuxtSvgSpriteSymbol>,
})
</script>
