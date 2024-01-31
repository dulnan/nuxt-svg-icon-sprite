<template>
  <div>
    <div class="flex flex-wrap gap-4">
      <figure
        v-for="symbol in symbols"
        :key="symbol"
        class="p-4 border"
        @click="current = symbol"
      >
        <SpriteSymbol :name="symbol" width="128" height="128" inline />
        <figcaption class="text-center font-semibold">{{ symbol }}</figcaption>
      </figure>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type Ref } from 'vue'
import { useSpriteData, ref } from '#imports'
import { type NuxtSvgSpriteSymbol } from '#nuxt-svg-sprite/runtime'

const { symbols } = useSpriteData()

const current: Ref<NuxtSvgSpriteSymbol> = ref('account')
</script>
