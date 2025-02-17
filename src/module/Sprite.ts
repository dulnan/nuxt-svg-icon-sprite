import { hash } from 'ohash'
import { HTMLElement } from 'node-html-parser'
import { resolveFiles, resolvePath } from '@nuxt/kit'
import { logger } from '../utils'
import type { ModuleContext, SpriteConfig } from '../types'
import { SpriteSymbol, type SpriteSymbolProcessed } from './SpriteSymbol'

export class Sprite {
  /**
   * The name of the sprite.
   */
  name: string

  /**
   * The sprite configuration.
   */
  config: SpriteConfig

  /**
   * The module context.
   */
  context: ModuleContext

  /**
   * The symbols beloning to the sprite.
   */
  private symbols: SpriteSymbol[] = []

  /**
   * The cached generated sprite markup.
   */
  generatedSprite: string | null = null

  /**
   * The hash of the generated sprite.
   */
  hash: string | null = null

  constructor(name: string, config: SpriteConfig, context: ModuleContext) {
    this.name = name
    this.config = config
    this.context = context
  }

  /**
   * Reset the generated sprite.
   */
  reset() {
    this.generatedSprite = null
    this.hash = null
  }

  async getSpriteFileName() {
    const { hash } = await this.getSprite()
    return `nuxt-svg/sprite-${this.name}.${hash}.svg`
  }

  private getImportPatternFiles(): Promise<string[]> {
    if (this.config.importPatterns?.length) {
      // Find all required files.
      return resolveFiles(this.context.srcDir, this.config.importPatterns, {
        followSymbolicLinks: false,
      })
    }

    return Promise.resolve([])
  }

  getPrefix() {
    return this.name === 'default' ? '' : this.name + '/'
  }

  async getProcessedSymbols(): Promise<
    { symbol: SpriteSymbol; processed: SpriteSymbolProcessed }[]
  > {
    const processedSymbols: {
      symbol: SpriteSymbol
      processed: SpriteSymbolProcessed
    }[] = []
    for (const symbol of this.symbols) {
      const processed = await symbol.getProcessed()
      if (processed) {
        processedSymbols.push({
          symbol,
          processed,
        })
      }
    }

    return processedSymbols.sort((a, b) =>
      a.symbol.id.localeCompare(b.symbol.id),
    )
  }

  /**
   * Initialise the sprite with all symbols in the configured import patterns.
   */
  async init() {
    const autoFiles = await this.getImportPatternFiles()
    autoFiles.forEach((filePath) => {
      this.symbols.push(new SpriteSymbol(filePath, this.config))
    })

    // User-provided symbols.
    if (this.config.symbolFiles) {
      const customSymbols = await Promise.all(
        Object.keys(this.config.symbolFiles).map((id) =>
          resolvePath(this.config.symbolFiles![id]),
        ),
      )
      customSymbols.forEach((filePath) =>
        this.symbols.push(new SpriteSymbol(filePath, this.config)),
      )
    }

    if (!this.symbols.length) {
      logger.error('No SVG files found in specified importPatterns.')
    }
  }

  async getSprite(): Promise<{ hash: string; content: string }> {
    if (!this.generatedSprite || !this.hash) {
      const svg = new HTMLElement('svg', {})
      svg.setAttributes({
        xmlns: 'http://www.w3.org/2000/svg',
        version: '1.1',
      })
      const defs = new HTMLElement('defs', {})
      const processedSymbols = await this.getProcessedSymbols()

      for (const processed of processedSymbols) {
        const symbol = new HTMLElement('symbol', {})
        symbol.setAttributes(processed.processed.attributes)
        symbol.setAttribute('id', processed.symbol.id)
        symbol.innerHTML = processed.processed.symbolDom
        if (this.context.dev) {
          defs.append(`\n\n<!-- File: ${processed.symbol.filePath} -->\n`)
        }
        defs.appendChild(symbol)
      }

      svg.appendChild(defs)

      if (this.config.processSprite) {
        await this.config.processSprite(svg, {
          name: this.name,
        })
      }

      const content = svg.toString()

      this.hash = hash(content)
      this.generatedSprite = content
    }

    return {
      content: this.generatedSprite,
      hash: this.hash,
    }
  }

  async handleAdd(path: string): Promise<void> {
    if (this.config.importPatterns) {
      const allFiles = await this.getImportPatternFiles()
      if (allFiles.includes(path)) {
        this.symbols.push(new SpriteSymbol(path, this.config))
        this.reset()
      }
    }
  }

  handleChange(path: string): Promise<void> {
    const match = this.symbols.find((v) => v.filePath === path)
    if (match) {
      match.reset()
      this.reset()
    }
    return Promise.resolve()
  }

  handleUnlink(path: string): Promise<void> {
    const match = this.symbols.find((v) => v.filePath === path)
    if (match) {
      this.symbols = this.symbols.filter((v) => v.id !== match.id)
      this.reset()
    }

    return Promise.resolve()
  }

  async handleAddDir(): Promise<void> {
    const importPatternFiles = await this.getImportPatternFiles()
    const existingFilePaths = this.symbols.map((v) => v.filePath)

    let hasAdded = false

    for (const filePath of importPatternFiles) {
      if (!existingFilePaths.includes(filePath)) {
        this.symbols.push(new SpriteSymbol(filePath, this.config))
        hasAdded = true
      }
    }

    if (hasAdded) {
      this.reset()
    }
  }

  handleUnlinkDir(folderPath: string): Promise<void> {
    // Find symbols that contain the removed folder path.
    const toRemove = this.symbols
      .filter((v) => v.filePath.includes(folderPath))
      .map((v) => v.filePath)
    if (toRemove.length) {
      this.symbols = this.symbols.filter((v) => toRemove.includes(v.filePath))
      this.reset()
    }
    return Promise.resolve()
  }
}
