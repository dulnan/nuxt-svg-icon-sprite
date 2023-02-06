import { SYMBOLS } from '#nuxt-svg-sprite'

type SpriteData = {
  symbols: string[]
}

export default function (): SpriteData {
  return { symbols: SYMBOLS }
}
