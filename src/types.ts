import type { Resolver } from '@nuxt/kit'

export type ExtractedSymbol = {
  content: string
  attributes: Record<string, string>
}

export type SpriteConfig = {
  /**
   * Array of patterns to scan when building the sprite.
   */
  importPatterns?: string[]

  /**
   * Directly define symbols to include after the automatic imports.
   *
   * Should be an object with the key being the symbol ID and the value the path
   * to the SVG.
   */
  symbolFiles?: Record<string, string>

  /**
   * Process each SVG before it is converted to a symbol.
   *
   * If you want to use SVGO, this is where you can do that.
   */
  processSvg?: (markup: string, filePath: string) => string | Promise<string>

  /**
   * Process each parsed symbol before it is added to the sprite.
   *
   * Use this to add, update or remove attributes.
   * Return either the same Symbol object or directly the markup for the
   * <symbol>. Note that at least the ID attribute must be present, else the
   * symbol won't work!
   */
  processSymbol?: (
    symbol: ExtractedSymbol,
    filePath: string,
  ) => ExtractedSymbol | string | Promise<ExtractedSymbol | string>

  /**
   * Process the finished sprite right before it's saved.
   */
  processSprite?: (markup: string, name: string) => string | Promise<string>
}

export type SymbolProcessed = {
  id: string
  content: string
  symbolDom: string
  symbolAttributes: Record<string, string>
  filePath: string
}

export type RuntimeOptions = {
  ariaHidden: boolean
}

export type ModuleContext = {
  dev: boolean
  srcDir: string
  buildAssetDir: string
  runtimeOptions: RuntimeOptions
  buildResolver: Resolver
}
