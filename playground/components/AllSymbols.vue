<template>
  <div class="flex flex-wrap gap-4">
    <figure v-for="symbol in symbols" :key="symbol" class="p-4 border">
      <SpriteSymbol :name="symbol" width="128" height="128" />
      <figcaption class="text-center font-semibold">{{ symbol }}</figcaption>
    </figure>
  </div>
</template>

<script setup lang="ts">
import { useSpriteData } from '#imports'

const { symbols } = useSpriteData()
</script>
