import type { ConsolaInstance } from 'consola'
import { parse } from 'node-html-parser'
import { useLogger } from '@nuxt/kit'
import type { ExtractedSymbol, SymbolProcessed } from '../types'

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
  const dom = parse(source)
  const svg = dom.querySelector('svg')
  if (!svg) {
    throw new Error('Invalid SVG.')
  }

  return {
    content: svg.innerHTML,
    attributes: svg.attributes || {},
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
