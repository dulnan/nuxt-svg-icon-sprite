import type { ConsolaInstance } from 'consola'
import { useLogger } from '@nuxt/kit'
import type {
  ExtractedSymbol,
  SymbolProcessed,
  ModuleContextLegacy,
} from '../types'

/**
 * Type check for falsy values.
 *
 * Used as the callback for array.filter, e.g.
 * items.filter(falsy)
 */
export function falsy<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined
}

export const logger: ConsolaInstance = useLogger('nuxt-svg-icon-sprite')

export function extractSymbol(source = ''): ExtractedSymbol {
  const [, parsedAttributes, content] =
    source.match(/<svg(.*?)>(.*?)<\/svg>/is) || []
  const matches = (parsedAttributes || '').match(
    /([\w-:]+)(=)?("[^<>"]*"|'[^<>']*'|[\w-:]+)/g,
  )

  const attributes =
    matches?.reduce<Record<string, string>>((acc, attribute) => {
      const [name, unformattedValue] = attribute.split('=')
      acc[name] = unformattedValue
        ? unformattedValue.replace(/['"]/g, '')
        : 'true'

      return acc
    }, {}) || {}

  return {
    attributes,
    content,
  }
}

/**
 * Returns a filter function to remove duplicate symbols.
 */
export function filterDuplicates() {
  const checked: Record<string, boolean> = {}
  return <T>(symbol: SymbolProcessed, index: number, self: Array<T>) => {
    if (checked[symbol.id]) {
      logger.error('Found duplicate symbol:', symbol)
      return false
    }
    checked[symbol.id] = true
    return true
  }
}

/**
 * Return the file name for a sprite.
 */
export function getSpriteFileName(
  name: string,
  hash = 'undefined',
  isDev: boolean,
) {
  return isDev ? `sprite-${name}.svg` : `sprite-${name}.${hash}.svg`
}

export function getAllHashes(context: ModuleContextLegacy) {
  return Object.keys(context)
    .map((v) => context[v]?.hash || 'undefined')
    .join('')
}
