import { hash } from 'ohash'
import { resolveFiles, resolvePath } from '@nuxt/kit'
import { logger } from '../utils'
import type { ModuleContext, SpriteConfig } from '../types'
import { SpriteSymbol } from './SpriteSymbol'

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
  symbols: SpriteSymbol[] = []

  /**
   * The cached generated sprite markup.
   */
  generatedSprite: string | null = null

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
    if (!this.generatedSprite) {
      const symbols = await Promise.all(
        this.symbols.map((symbol) => symbol.getProcessed()),
      ).then((processed) => processed.map((v) => v.spriteContent))

      // @TODO: filterDuplicates
      let content = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1"><defs>\n${symbols.join(
        '  \n',
      )}\n</defs></svg>`
      if (this.config.processSprite) {
        content = await Promise.resolve(
          this.config.processSprite(content, this.name),
        )
      }

      this.generatedSprite = content
    }

    const spriteHash = hash(this.generatedSprite)
    return {
      content: this.generatedSprite,
      hash: spriteHash,
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
    return Promise.resolve()
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

  handleAddDir(folderPath: string): Promise<void> {
    return Promise.resolve()
  }

  handleUnlinkDir(folderPath: string): Promise<void> {
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
