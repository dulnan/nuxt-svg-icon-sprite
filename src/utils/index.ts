import { promises as fs } from 'fs'
import path from 'path'
import { hash } from 'ohash'
import { useLogger, resolveFiles, resolvePath } from '@nuxt/kit'
import {
  Symbol,
  SymbolProcessed,
  SpriteConfig,
  SpriteContext,
  ModuleContext,
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

export const logger = useLogger('nuxt-svg-icon-sprite')

export function extractSymbol(source = ''): Symbol {
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
 * Generate the sprite.
 */
export async function generateSprite(
  name: string,
  spriteConfig: SpriteConfig,
  srcDir: string,
  debug = false,
): Promise<SpriteContext | undefined> {
  const files: { filePath: string; id: string }[] = []

  // Autoimported SVGs.
  if (spriteConfig.importPatterns?.length) {
    // Find all required files.
    const autoFiles = await resolveFiles(srcDir, spriteConfig.importPatterns, {
      followSymbolicLinks: false,
    }).then((files) => {
      return files.map((filePath) => {
        const id = path.parse(filePath).name
        return { filePath, id }
      })
    })
    files.push(...autoFiles)
  }

  // User-provided symbols.
  if (spriteConfig.symbolFiles) {
    const customSymbols = await Promise.all(
      Object.keys(spriteConfig.symbolFiles).map((id) => {
        return resolvePath(spriteConfig.symbolFiles![id]).then((filePath) => {
          return { filePath, id }
        })
      }),
    )
    files.push(...customSymbols)
  }

  if (!files.length) {
    logger.error('No SVG files found in specified importPatterns.')
    return
  }

  // Read files and add them to the spriter instance.
  const symbols: SymbolProcessed[] = await Promise.all(
    files.map(({ filePath, id }) => {
      return fs
        .readFile(filePath)
        .then((contents) => {
          const markup = contents.toString()
          if (spriteConfig.processSvg) {
            return spriteConfig.processSvg(markup, filePath)
          }
          return markup
        })
        .then((markup) => {
          const symbol = extractSymbol(markup)
          symbol.attributes.id = id
          if (spriteConfig.processSymbol) {
            return spriteConfig.processSymbol(symbol, filePath)
          }

          return symbol
        })
        .then((result) => {
          if (typeof result === 'string') {
            return { content: result, id, filePath }
          }

          const attributes: string = Object.keys(result.attributes)
            .map((attribute: any) => {
              return `${attribute}="${result.attributes[attribute]}"`
            })
            .join(' ')
          const content = `<symbol ${attributes}>\n  ${result.content}\n</symbol>`
          return { content, id, filePath, symbolDom: result.content, symbolAttributes: result.attributes }
        })
        .catch((e) => {
          logger.error(e)
        })
    }),
  )
    .then((symbols) => {
      return symbols.filter(falsy) as SymbolProcessed[]
    })
    .then((symbols) => symbols.filter(filterDuplicates()))

  // Compile sprite.
  try {
    let content = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1"><defs>\n${symbols
      .map((v) => {
        return debug ? `<!-- ${v.filePath} -->\n${v.content}\n\n` : v.content
      })
      .join('  \n')}\n</defs></svg>`
    if (spriteConfig.processSprite) {
      content = await Promise.resolve(spriteConfig.processSprite(content, name))
    }
    return { content, hash: hash(content), symbols, name }
  } catch (e) {
    logger.error('Failed to generate SVG sprite.')
    logger.log(e)
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

export function buildRuntimeTemplate(context: ModuleContext, isDev: boolean) {
  const spriteKeys = Object.keys(context)
  const type = spriteKeys
    .map((v) => {
      const prefix = v === 'default' ? '' : v + '/'
      return (context[v]?.symbols || []).map((symbol) => {
        return prefix + symbol.id
      })
    })
    .flat()
    .map((v) => {
      return `'${v}'`
    })
    .join('\n  | ')

  const fileNames = spriteKeys.reduce<Record<string, string>>((acc, key) => {
    const spriteContext = context[key]
    if (spriteContext) {
      let name = context[key]
        ? getSpriteFileName(key, spriteContext.hash, isDev)
        : undefined
      if (isDev) {
        name += '?t=' + Date.now()
      }
      acc[key] = '/_nuxt/' + name
    }
    return acc
  }, {})

  return `
/**
 * Keys of all generated SVG sprite symbols.
 */
export type NuxtSvgSpriteSymbol =
  | ${type}

export const SPRITE_PATHS = ${JSON.stringify(fileNames)}
`
}

export function buildDataTemplate(context: ModuleContext) {

  const allIcons = Object.keys(context)
    .map((v) => {
      const prefix = v === 'default' ? '' : v + '/'
      return (context[v]?.symbols || []).map((symbol) => {
        return prefix + symbol.id
      })
    })
    .flat()

  const allSymbolDoms = Object.fromEntries(
    Object.values(context)
      .map((v) => {
        return v?.symbols
      })
      .flat()
      .map((v) => [v.id, {
        dom: v.symbolDom,
        attributes: v.symbolAttributes
      }])
  )

  return `
import { NuxtSvgSpriteSymbol } from './runtime'
/**
 * Keys of all generated SVG sprite symbols.
 */
export const ALL_SYMBOL_KEYS: NuxtSvgSpriteSymbol[] = ${JSON.stringify(
    allIcons,
  )}

/**
 * DOM of all symbols by key.
 */
export const ALL_SYMBOL_DOMS: Record<NuxtSvgSpriteSymbol, { dom: string, attributes: { [key: string]: string } }> = ${JSON.stringify(allSymbolDoms)}
`
}

export function getAllHashes(context: ModuleContext) {
  return Object.keys(context)
    .map((v) => context[v]?.hash || 'undefined')
    .join('')
}
