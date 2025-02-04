import type { NuxtSvgSpriteSymbol } from '#nuxt-svg-sprite/runtime'
import { SPRITE_PATHS } from '#nuxt-svg-sprite/runtime'
import { ALL_SYMBOL_KEYS } from '#nuxt-svg-sprite/data'

type SpriteData = {
  symbols: NuxtSvgSpriteSymbol[]
  spritePaths: typeof SPRITE_PATHS
}

export default function (): SpriteData {
  return { symbols: ALL_SYMBOL_KEYS, spritePaths: SPRITE_PATHS }
}
