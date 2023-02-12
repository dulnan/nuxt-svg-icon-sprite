import { ALL_SYMBOL_KEYS } from '#nuxt-svg-sprite/data'

type SpriteData = {
  symbols: string[]
}

export default function (): SpriteData {
  return { symbols: ALL_SYMBOL_KEYS }
}
