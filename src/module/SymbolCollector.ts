import { relative } from 'pathe'
import { falsy } from '../utils'
import type { ModuleContext, SpriteConfig } from '../types'
import { Sprite } from './Sprite'

export class SymbolCollector {
  sprites: Sprite[]
  context: ModuleContext

  constructor(
    spritesConfig: Record<string, SpriteConfig>,
    context: ModuleContext,
  ) {
    this.sprites = Object.entries(spritesConfig).map(([key, config]) => {
      return new Sprite(key, config, context)
    })
    this.context = context
  }

  async init(): Promise<void> {
    await Promise.all(this.sprites.map((sprite) => sprite.init()))
  }

  async getRuntimeTemplate() {
    const fileNames: Record<string, string> = {}

    for (const sprite of this.sprites) {
      if (this.context.dev) {
        const { hash } = await sprite.getSprite()
        fileNames[sprite.name] = `/_nuxt/nuxt-svg-sprite/${sprite.name}/${hash}`
      } else {
        fileNames[sprite.name] =
          this.context.buildAssetDir + sprite.getSpriteFileName()
      }
    }

    return `
export const SPRITE_PATHS = ${JSON.stringify(fileNames, null, 2)}
export const runtimeOptions = ${JSON.stringify(this.context.runtimeOptions)}
`
  }

  getRuntimeTypeTemplate() {
    const type = this.sprites
      .map((sprite) => {
        const prefix = sprite.name === 'default' ? '' : sprite.name + '/'
        return sprite.symbols.map((symbol) => {
          return prefix + symbol.id
        })
      })
      .flat()
      .map((v) => {
        return `'${v}'`
      })
      .join('\n  | ')

    return `
declare module '#nuxt-svg-sprite/runtime' {
  /**
   * Keys of all generated SVG sprite symbols.
   */
  export type NuxtSvgSpriteSymbol =
    | ${type || 'never'}

  export type RuntimeOptions = {
    ariaHidden: boolean
  }

  export const SPRITE_PATHS: Record<string, string>
  export const runtimeOptions: RuntimeOptions
}`
  }

  async buildDataTemplate() {
    const allIcons = this.sprites
      .map((sprite) => {
        const prefix = sprite.name === 'default' ? '' : sprite.name + '/'
        return sprite.symbols.map((symbol) => {
          return prefix + symbol.id
        })
      })
      .flat()

    const allSymbolDoms = await Promise.all(
      this.sprites
        .map((sprite) => {
          if (sprite.symbols.length) {
            return sprite.symbols.map((symbol) => {
              return { symbol, spriteId: sprite.name }
            })
          }
          return null
        })
        .flat()
        .filter(falsy)
        .map(async (v) => {
          const processed = await v.symbol.getProcessed()
          return [
            v.spriteId === 'default'
              ? v.symbol.id
              : `${v.spriteId}/${v.symbol.id}`,
            {
              dom: processed.symbolDom,
              attributes: processed.attributes,
            },
          ]
        }),
    )

    const allSprites: Record<string, string> = {}

    for (const sprite of this.sprites) {
      const { content } = await sprite.getSprite()
      allSprites[sprite.name] = content
    }

    return `
export const ALL_SYMBOL_KEYS = ${JSON.stringify(allIcons, null, 2)}

export const ALL_SYMBOL_DOMS = ${JSON.stringify(
      Object.fromEntries(allSymbolDoms),
      null,
      2,
    )}

export const ALL_SPRITES = ${JSON.stringify(allSprites, null, 2)}
`
  }

  buildDataTypeTemplate() {
    return `import type { NuxtSvgSpriteSymbol } from './runtime'

declare module '#nuxt-svg-sprite/data' {
  export const ALL_SYMBOL_KEYS: NuxtSvgSpriteSymbol[]
  export const ALL_SYMBOL_DOMS: Record<NuxtSvgSpriteSymbol, { dom: string, attributes: { [key: string]: string } }>
  export const ALL_SPRITES: Record<string, string>
}`
  }

  async buildSymbolImportTemplate() {
    const buildPath = this.context.buildResolver.resolve('./nuxt-svg-sprite')

    const imports = await Promise.all(
      this.sprites
        .map((sprite) => {
          if (sprite.symbols.length) {
            return sprite.symbols.map((symbol) => {
              return { symbol, spriteId: sprite.name }
            })
          }
          return null
        })
        .flat()
        .filter(falsy)
        .map(async (v) => {
          const id =
            v.spriteId === 'default'
              ? v.symbol.id
              : `${v.spriteId}/${v.symbol.id}`

          const importPath = relative(buildPath, v.symbol.filePath)
          const { attributes, fileContents } = await v.symbol.getProcessed()

          const importMethod = this.context.dev
            ? `() => Promise.resolve(${JSON.stringify(fileContents)})`
            : `() => import('${importPath}?raw').then(v => v.default)`

          return `'${id}': { import: ${importMethod}, attributes: ${JSON.stringify(
            attributes,
          )} },`
        }),
    )

    return `export const SYMBOL_IMPORTS = {
  ${imports.join('\n  ')}
}`
  }

  buildSymbolImportTypeTemplate() {
    return `import type { NuxtSvgSpriteSymbol } from './runtime'

type SymbolImport = {
  import: () => Promise<string>
  attributes: Record<string, string>
}

export const SYMBOL_IMPORTS: Record<NuxtSvgSpriteSymbol, SymbolImport>
`
  }

  async handleAdd(path: string): Promise<void> {
    await Promise.all(this.sprites.map((sprite) => sprite.handleAdd(path)))
  }

  async handleChange(path: string): Promise<void> {
    await Promise.all(this.sprites.map((sprite) => sprite.handleChange(path)))
  }

  async handleUnlink(path: string): Promise<void> {
    await Promise.all(this.sprites.map((sprite) => sprite.handleUnlink(path)))
  }

  async handleAddDir(folderPath: string): Promise<void> {
    await Promise.all(
      this.sprites.map((sprite) => sprite.handleAddDir(folderPath)),
    )
  }

  async handleUnlinkDir(folderPath: string): Promise<void> {
    await Promise.all(
      this.sprites.map((sprite) => sprite.handleUnlinkDir(folderPath)),
    )
  }
}
