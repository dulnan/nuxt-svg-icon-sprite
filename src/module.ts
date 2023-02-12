import { promises as fs } from 'fs'
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
import SvgSprite from 'svg-sprite'
import type { Config, DefsAndSymbolSpecificModeConfig } from 'svg-sprite'

export const logger = useLogger('nuxt-svg-icon-sprite')

type SpriteConfig = {
  /**
   * Array of patterns to scan when building the sprite.
   */
  importPatterns?: string[]

  /**
   * Configuration for svg-sprite.
   */
  svgSpriteConfig?: {
    svg?: Config['svg']
    shape?: Config['shape']
    log?: Config['log']
    mode?: {
      symbol?: DefsAndSymbolSpecificModeConfig
    }
  }

  /**
   * Process each SVG before it is added to the sprite.
   *
   * For example you could execute svgo on the SVG markup.
   */
  processSvg?: (markup: string, filePath: string) => string | Promise<string>
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

type SpriteContext = {
  content: string
  hash: string
  icons: string[]
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
        svgSpriteConfig: {
          shape: {
            dimension: {
              attributes: true,
            },
            transform: [],
          },
        },
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
        icons: [],
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
      // Create spriter instance.
      const spriter = new SvgSprite({
        svg: spriteConfig.svgSpriteConfig?.svg,
        shape: spriteConfig.svgSpriteConfig?.shape,
        log: spriteConfig.svgSpriteConfig?.log,
        mode: {
          symbol: spriteConfig.svgSpriteConfig?.mode?.symbol || true,
        },
      })

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
      await Promise.all(
        files.map((filePath) => {
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
              spriter.add(filePath, null, markup)
            })
        }),
      )

      // Compile sprite.
      try {
        const { data, result } = await spriter.compileAsync()
        const content = result.symbol.sprite.contents.toString()
        context[name].content = content
        context[name].hash = hash(content)
        context[name].icons = data.symbol.shapes.map((v: any) => v.name)
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
      filename: 'nuxt-svg-sprite.ts',
      write: true,
      options: {
        nuxtSvgSprite: true,
      },
      getContents: () => {
        const type = spriteKeys
          .map((v) => {
            const prefix = v === 'default' ? '' : v + '/'
            return context[v].icons.map((icon) => {
              return prefix + icon
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
      filename: 'nuxt-svg-sprite-data.ts',
      write: true,
      options: {
        nuxtSvgSprite: true,
      },
      getContents: () => {
        const allIcons = spriteKeys
          .map((v) => {
            const prefix = v === 'default' ? '' : v + '/'
            return context[v].icons.map((icon) => {
              return prefix + icon
            })
          })
          .flat()

        return `
/**
 * Keys of all generated SVG sprite symbols.
 */
export const ALL_SYMBOL_KEYS = ${JSON.stringify(allIcons)}
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

    if (DEV) {
      nuxt.hook('vite:serverCreated', (viteServer) => {
        // Watch for file changes in dev mode.
        nuxt.hook('builder:watch', async (event, path) => {
          // We only care about SVG files.
          if (!path.match(/\.(svg)$/)) {
            return
          }

          const hashBefore = context.hash
          await Promise.all(
            spriteKeys.map((v) => {
              return generateSprite(v, moduleOptions.sprites[v])
            }),
          )

          // Don't update templates if nothing changed.
          if (hashBefore === context.hash) {
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
