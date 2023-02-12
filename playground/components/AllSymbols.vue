<template>
  <div>
    <div class="flex flex-wrap gap-4">
      <figure
        v-for="symbol in symbols"
        :key="symbol"
        class="p-4 border"
        @click="current = symbol"
      >
        <SpriteSymbol :name="symbol" width="128" height="128" />
        <figcaption class="text-center font-semibold">{{ symbol }}</figcaption>
      </figure>
    </div>

    <!-- Test reactivity. -->
    <SpriteSymbol
      :name="current"
      width="128"
      height="128"
      class="text-green-600"
      fill="currentColor"
    />
    {{ current }}
  </div>
</template>

<script setup lang="ts">
import { Ref } from 'vue'
import { useSpriteData } from '#imports'
import { NuxtSvgSpriteSymbol } from '~~/.nuxt/nuxt-svg-sprite/runtime'

const { symbols } = useSpriteData()

const current: Ref<NuxtSvgSpriteSymbol> = ref('account')
</script>
