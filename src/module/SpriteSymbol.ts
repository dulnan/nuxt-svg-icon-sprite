import path from 'node:path'
import { promises as fs } from 'node:fs'
import { parse } from 'node-html-parser'
import type { SpriteConfig } from '../types'
import { logger } from '../utils'

/**
 * A fully processed symbol.
 */
export type SpriteSymbolProcessed = {
  attributes: Record<string, string>
  symbolDom: string
}

export class SpriteSymbol {
  config: SpriteConfig
  filePath: string
  id: string
  processed: Promise<SpriteSymbolProcessed | null> | null = null

  constructor(filePath: string, config: SpriteConfig) {
    this.id = path.parse(filePath).name
    this.filePath = filePath
    this.config = config
  }

  reset() {
    this.processed = null
  }

  getProcessed(): Promise<SpriteSymbolProcessed | null> | null {
    if (this.processed === null) {
      this.processed = fs
        .readFile(this.filePath)
        .then(async (buffer) => {
          const fileContents = buffer.toString().trim()

          if (!fileContents) {
            throw new Error('SVG file is empty.')
          }

          if (!fileContents.includes('<svg')) {
            throw new Error('Invalid SVG.')
          }

          const dom = parse(fileContents)
          const svg = dom.querySelector('svg')
          if (!svg) {
            throw new Error('Failed to find <svg> in file.')
          }

          if (this.config.processSpriteSymbol) {
            await this.config.processSpriteSymbol(svg, {
              id: this.id,
              filePath: this.filePath,
            })
          }

          const attributes = {
            ...svg.attributes,
            id: this.id,
          }

          return {
            attributes,
            symbolDom: svg.innerHTML,
          }
        })
        .catch((e) => {
          if (e instanceof Error) {
            logger.warn(`Failed to process SVG "${this.filePath}":`, e)
          }
          return null
        })

      return this.processed
    }

    return this.processed
  }
}
