import type { ConsolaInstance } from 'consola'
import { useLogger } from '@nuxt/kit'

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
