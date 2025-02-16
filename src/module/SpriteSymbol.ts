import path from 'node:path'
import { promises as fs } from 'node:fs'
import { extractSymbol } from '../utils'
import type { ExtractedSymbol, SpriteConfig } from '../types'

/**
 * A fully processed symbol.
 */
type SpriteSymbolProcessed = {
  fileContents: string
  attributes: Record<string, string>
  symbolDom: string
  spriteContent: string
}

export class SpriteSymbol {
  config: SpriteConfig
  filePath: string
  id: string
  processed: SpriteSymbolProcessed | null = null

  constructor(filePath: string, config: SpriteConfig) {
    this.id = path.parse(filePath).name
    this.filePath = filePath
    this.config = config
  }

  reset() {
    this.processed = null
  }

  async getProcessed(): Promise<SpriteSymbolProcessed> {
    if (!this.processed) {
      const buffer = await fs.readFile(this.filePath)
      const fileContents = buffer.toString()
      const processedSvg = this.config.processSvg
        ? await this.config.processSvg(fileContents, this.filePath)
        : fileContents

      const symbol = extractSymbol(processedSvg)
      symbol.attributes.id = this.id
      const processedSymbol = await this.processSymbol(symbol)

      const attributesString: string = Object.keys(processedSymbol.attributes)
        .map((attribute: any) => {
          return `${attribute}="${processedSymbol.attributes[attribute]}"`
        })
        .join(' ')
      const spriteContent = `<symbol ${attributesString}>\n  ${processedSymbol.content}\n</symbol>`
      const symbolDom = processedSymbol.content
      const attributes = processedSymbol.attributes
      this.processed = {
        fileContents,
        attributes,
        symbolDom,
        spriteContent,
      }
    }

    return this.processed
  }

  private async processSymbol(
    symbol: ExtractedSymbol,
  ): Promise<ExtractedSymbol> {
    if (this.config.processSymbol) {
      const result = await this.config.processSymbol(symbol, this.filePath)
      if (typeof result === 'string') {
        const processedSymbol = extractSymbol(result)
        return processedSymbol
      }
      return result
    }

    return symbol
  }
}
