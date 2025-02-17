import type { ModuleContext, SpriteConfig } from '../types'
import { Sprite } from './Sprite'

export class Collector {
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
        fileNames[sprite.name] =
          `${this.context.buildAssetsDir}nuxt-svg-sprite/sprite.${sprite.name}.${hash}.svg`
      } else {
        fileNames[sprite.name] =
          this.context.buildAssetsDir + (await sprite.getSpriteFileName())
      }
    }

    return `
export const SPRITE_PATHS = ${JSON.stringify(fileNames, null, 2)}
export const runtimeOptions = ${JSON.stringify(this.context.runtimeOptions)}
`
  }

  async getRuntimeTypeTemplate() {
    const types: string[] = []

    for (const sprite of this.sprites) {
      const prefix = sprite.name === 'default' ? '' : sprite.name + '/'
      const processed = await sprite.getProcessedSymbols()
      for (const v of processed) {
        types.push(JSON.stringify(prefix + v.symbol.id))
      }
    }

    const NuxtSvgSpriteSymbol = types.sort().join('\n    | ') || 'never'

    return `
declare module '#nuxt-svg-sprite/runtime' {
  /**
   * Keys of all generated SVG sprite symbols.
   */
  export type NuxtSvgSpriteSymbol =
    | ${NuxtSvgSpriteSymbol}

  export type RuntimeOptions = {
    ariaHidden: boolean
  }

  export const SPRITE_PATHS: Record<string, string>
  export const runtimeOptions: RuntimeOptions
}`
  }

  async buildDataTemplate() {
    const allIcons: string[] = []
    const allSymbolDoms: [
      string,
      { dom: string; attributes: Record<string, string> },
    ][] = []

    for (const sprite of this.sprites) {
      const processedSymbols = await sprite.getProcessedSymbols()

      processedSymbols.forEach((v) => {
        const idWithPrefix = sprite.getPrefix() + v.symbol.id
        allIcons.push(idWithPrefix)

        allSymbolDoms.push([
          idWithPrefix,
          {
            dom: v.processed.symbolDom,
            attributes: v.processed.attributes,
          },
        ])
      })
    }

    const allSprites: Record<string, string> = {}

    for (const sprite of this.sprites) {
      const { content } = await sprite.getSprite()
      allSprites[sprite.name] = content
    }

    return `
export const ALL_SYMBOL_KEYS = ${JSON.stringify(allIcons.sort(), null, 2)}

export const ALL_SYMBOL_DOMS = ${JSON.stringify(
      Object.fromEntries(allSymbolDoms),
      null,
      2,
    )}

export const ALL_SPRITES = ${JSON.stringify(allSprites, null, 2)}
`
  }

  buildDataTypeTemplate() {
    return `declare module '#nuxt-svg-sprite/data' {
  import type { NuxtSvgSpriteSymbol } from './runtime'

  export const ALL_SYMBOL_KEYS: NuxtSvgSpriteSymbol[]
  export const ALL_SYMBOL_DOMS: Record<NuxtSvgSpriteSymbol, { dom: string, attributes: { [key: string]: string } }>
  export const ALL_SPRITES: Record<string, string>
}`
  }

  async buildSymbolImportTemplate() {
    const imports: string[] = []

    for (const sprite of this.sprites) {
      const processed = await sprite.getProcessedSymbols()

      for (const v of processed) {
        const id = sprite.getPrefix() + v.symbol.id

        const importMethodInline = JSON.stringify({
          content: v.processed.symbolDom,
          attributes: v.processed.attributes,
        })
        const importMethodDynamic = `() => import('#build/nuxt-svg-sprite/symbols/${id}').then(v => v.default)`

        // In dev mode, always use the inlined markup.
        // In build, use dynamic import on client and inline on the server.
        const importStatement = this.context.dev
          ? importMethodInline
          : `import.meta.client ? ${importMethodDynamic} : ${importMethodInline}`

        imports.push(`${JSON.stringify(id)}: ${importStatement}`)
      }
    }

    return `export const SYMBOL_IMPORTS = {
  ${imports.sort().join(',\n  ')}
}`
  }

  buildSymbolImportTypeTemplate() {
    return `declare module '#nuxt-svg-sprite/symbol-import' {
  import type { NuxtSvgSpriteSymbol } from './runtime'

  type SymbolImport = {
    content: string
    attributes: Record<string, string>
  }

  type SymbolImportDynamic = () => Promise<SymbolImport>

  export const SYMBOL_IMPORTS: Record<NuxtSvgSpriteSymbol, SymbolImport | SymbolImportDynamic>
}`
  }

  /**
   * SVG file was added.
   */
  async handleAdd(path: string): Promise<void> {
    await Promise.all(this.sprites.map((sprite) => sprite.handleAdd(path)))
  }

  /**
   * SVG file was changed.
   */
  async handleChange(path: string): Promise<void> {
    await Promise.all(this.sprites.map((sprite) => sprite.handleChange(path)))
  }

  /**
   * SVG file was removed.
   */
  async handleUnlink(path: string): Promise<void> {
    await Promise.all(this.sprites.map((sprite) => sprite.handleUnlink(path)))
  }

  /**
   * Any directory was added.
   */
  async handleAddDir(): Promise<void> {
    await Promise.all(this.sprites.map((sprite) => sprite.handleAddDir()))
  }

  /**
   * Any directory was removed.
   */
  async handleUnlinkDir(folderPath: string): Promise<void> {
    await Promise.all(
      this.sprites.map((sprite) => sprite.handleUnlinkDir(folderPath)),
    )
  }
}
