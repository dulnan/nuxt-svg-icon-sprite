import { promises as fs } from 'fs'
import path from 'path'
import {
  createResolver,
  defineNuxtModule,
  updateTemplates,
  resolveFiles,
  addTemplate,
  addComponent,
  useLogger,
  addImportsDir,
} from '@nuxt/kit'
import { hash } from 'ohash'

export const logger = useLogger('nuxt-svg-icon-sprite')

type Symbol = {
  content: string
  attributes: Record<string, string>
}

function extractSymbol(source = ''): Symbol {
  const [, parsedAttributes, content] =
    source.match(/<svg(.*?)>(.*?)<\/svg>/is) || []
  const matches = (parsedAttributes || '').match(
    /([\w-:]+)(=)?("[^<>"]*"|'[^<>']*'|[\w-:]+)/g,
  )

  const attributes =
    matches?.reduce<Record<string, string>>((result, attribute) => {
      const [name, unformattedValue] = attribute.split('=')

      // eslint-disable-next-line no-param-reassign
      result[name] = unformattedValue
        ? unformattedValue.replace(/['"]/g, '')
        : 'true'

      return result
    }, {}) || {}

  return {
    attributes,
    content,
  }
}

type SpriteConfig = {
  /**
   * Array of patterns to scan when building the sprite.
   */
  importPatterns?: string[]

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
    symbol: Symbol,
    filePath: string,
  ) => Symbol | string | Promise<Symbol | string>

  /**
   * Process the finished sprite right before it's saved.
   */
  processSprite?: (markup: string, key: string) => string | Promise<string>
}

/**
 * Options for the nuxt-svg-icon-sprite module.
 */
export type ModuleOptions = {
  /**
   * Define the config for each sprite to generate.
   *
   * Currently only one sprite is supported, multiple will be possible in the
   * future.
   */
  sprites: Record<string, SpriteConfig>
}

type SymbolProcessed = {
  id: string
  content: string
  filePath: string
}

type SpriteContext = {
  content: string
  hash: string
  symbols: SymbolProcessed[]
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-svg-icon-sprite',
    configKey: 'svgIconSprite',
    compatibility: {
      nuxt: '^3.0.0',
    },
  },
  defaults: {
    sprites: {
      default: {
        importPatterns: ['./assets/icons/*.svg'],
      },
    },
  },
  async setup(moduleOptions, nuxt) {
    const DEV = nuxt.options.dev

    // The path to the source directory of this module's consumer.
    const srcDir = nuxt.options.srcDir
    const srcResolver = createResolver(srcDir)

    // The path of this module.
    const resolver = createResolver(import.meta.url)

    // Add plugin and transpile runtime directory.
    nuxt.options.build.transpile.push(resolver.resolve('runtime'))

    const spriteKeys = Object.keys(moduleOptions.sprites)

    // Keeps track of the current generated sprite data.
    const context: Record<string, SpriteContext> = spriteKeys.reduce<
      Record<string, SpriteContext>
    >((acc, v) => {
      acc[v] = {
        content: '',
        hash: '',
        symbols: [],
      }
      return acc
    }, {})

    // Add composables.
    addImportsDir(resolver.resolve('runtime/composables'))

    // Return the file name of the sprite.
    function getSpriteFileName(name: string) {
      return DEV
        ? `sprite-${name}.svg`
        : `sprite-${name}.${context[name].hash}.svg`
    }

    // Builds the SVG sprite.
    async function generateSprite(name: string, spriteConfig: SpriteConfig) {
      // Find all required files.
      const files = await resolveFiles(
        srcResolver.resolve(),
        // It's guaranteed to be here because we declare it as a default.
        spriteConfig.importPatterns!,
        {
          followSymbolicLinks: false,
        },
      )

      if (!files.length) {
        logger.error('No SVG files found in specified importPatterns.')
        return
      }

      // Read files and add them to the spriter instance.
      const symbols: SymbolProcessed[] = await Promise.all(
        files.map((filePath) => {
          const id = path.parse(filePath).name
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
              const content = `<symbol ${attributes}>${result.content}</symbol>`
              return { content, id, filePath }
            })
        }),
      )

      // Compile sprite.
      try {
        let content = `<svg xmlns="http://www.w3.org/2000/svg">\n  ${symbols
          .map((v) => v.content)
          .join('  \n')}\n</svg>`
        if (spriteConfig.processSprite) {
          content = await Promise.resolve(
            spriteConfig.processSprite(content, name),
          )
        }
        context[name].content = content
        context[name].hash = hash(content)
        context[name].symbols = symbols
      } catch (e) {
        logger.error('Failed to generate SVG sprite.')
        logger.log(e)
      }
    }

    await Promise.all(
      spriteKeys.map(async (key) => {
        // Generate sprite initially.
        await generateSprite(key, moduleOptions.sprites[key])

        // Add the template for the SVG sprite.
        addTemplate({
          filename: 'dist/client/_nuxt/' + getSpriteFileName(key),
          write: true,
          options: {
            nuxtSvgSprite: true,
          },
          getContents: () => {
            return context[key].content
          },
        })
      }),
    )

    // Template containing the types and the relative URL path to the generated
    // sprite.
    const template = addTemplate({
      filename: 'nuxt-svg-sprite/runtime.ts',
      write: true,
      options: {
        nuxtSvgSprite: true,
      },
      getContents: () => {
        const type = spriteKeys
          .map((v) => {
            const prefix = v === 'default' ? '' : v + '/'
            return context[v].symbols.map((symbol) => {
              return prefix + symbol.id
            })
          })
          .flat()
          .map((v) => {
            return `'${v}'`
          })
          .join('\n  | ')

        const fileNames = spriteKeys.reduce<Record<string, string>>(
          (acc, key) => {
            let name = getSpriteFileName(key)
            if (DEV) {
              name += '?t=' + Date.now()
            }
            acc[key] = '/_nuxt/' + name
            return acc
          },
          {},
        )

        return `
/**
 * Keys of all generated SVG sprite symbols.
 */
export type NuxtSvgSpriteSymbol =
  | ${type}

export const SPRITE_PATHS = ${JSON.stringify(fileNames)}
`
      },
    })

    const templateData = addTemplate({
      filename: 'nuxt-svg-sprite/data.ts',
      write: true,
      options: {
        nuxtSvgSprite: true,
      },
      getContents: () => {
        const allIcons = spriteKeys
          .map((v) => {
            const prefix = v === 'default' ? '' : v + '/'
            return context[v].symbols.map((symbol) => {
              return prefix + symbol.id
            })
          })
          .flat()

        return `
import { NuxtSvgSpriteSymbol } from './runtime'
/**
 * Keys of all generated SVG sprite symbols.
 */
export const ALL_SYMBOL_KEYS: NuxtSvgSpriteSymbol[] = ${JSON.stringify(
          allIcons,
        )}
`
      },
    })

    // Add an alias for the generated template. This is used inside the
    // SpriteSymbol component to type the props and to get the URL to the
    // sprite.
    nuxt.options.alias['#nuxt-svg-sprite/runtime'] = template.dst
    nuxt.options.alias['#nuxt-svg-sprite/data'] = templateData.dst

    // Add the component.
    await addComponent({
      filePath: resolver.resolve('./runtime/components/SpriteSymbol'),
      name: 'SpriteSymbol',
      global: true,
    })

    function getAllHashes() {
      return Object.keys(context)
        .map((v) => context[v].hash)
        .join('')
    }

    if (DEV) {
      nuxt.hook('vite:serverCreated', (viteServer) => {
        // Watch for file changes in dev mode.
        nuxt.hook('builder:watch', async (event, path) => {
          // We only care about SVG files.
          if (!path.match(/\.(svg)$/)) {
            return
          }

          const hashBefore = getAllHashes()
          await Promise.all(
            spriteKeys.map((v) => {
              return generateSprite(v, moduleOptions.sprites[v])
            }),
          )
          const hashAfter = getAllHashes()

          // Don't update templates if nothing changed.
          if (hashBefore === hashAfter) {
            return
          }

          // Both templates must update when the sprite changes.
          await updateTemplates({
            filter: (template) => {
              return template.options && template.options.nuxtSvgSprite
            },
          })

          // This template is imported in the SpriteSymbol component, so we can
          // trigger a reload, which will also reload the sprite.
          const modules = viteServer.moduleGraph.getModulesByFile(template.dst)
          if (modules) {
            modules.forEach((v) => {
              viteServer.reloadModule(v)
            })
          }
        })
      })
    }
  },
})
