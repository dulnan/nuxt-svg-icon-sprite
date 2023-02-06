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
  sprites: {
    default: SpriteConfig
  }
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

    // Keeps track of the current generated sprite data.
    const context = {
      // The compiled markup of the SVG sprite.
      content: '',

      // A build hash of the sprite.
      hash: '',

      // An array of generated symbol names.
      icons: [] as string[],
    }

    // Add composables.
    addImportsDir(resolver.resolve('runtime/composables'))

    // Return the file name of the sprite.
    function getSpriteFileName() {
      return DEV ? 'sprite.svg' : `sprite.${context.hash}.svg`
    }

    // Builds the SVG sprite.
    async function generateSprite() {
      // @TODO: Support for multiple sprites.
      const spriteConfig = moduleOptions.sprites.default

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
        context.content = content
        context.hash = hash(content)
        context.icons = data.symbol.shapes.map((v: any) => v.name)
      } catch (e) {
        logger.error('Failed to generate SVG sprite.')
        logger.log(e)
      }
    }

    // Generate sprite initially.
    await generateSprite()

    // Add the template for the SVG sprite.
    addTemplate({
      filename: 'dist/client/_nuxt/' + getSpriteFileName(),
      write: true,
      options: {
        nuxtSvgSprite: true,
      },
      getContents: () => {
        return context.content
      },
    })

    // Template containing the types and the relative URL path to the generated
    // sprite.
    const template = addTemplate({
      filename: 'nuxt-svg-sprite.ts',
      write: true,
      options: {
        nuxtSvgSprite: true,
      },
      getContents: () => {
        const type = context.icons
          .map((v) => {
            return `'${v}'`
          })
          .join('\n  | ')

        let fileName = getSpriteFileName()
        if (DEV) {
          fileName += '?t=' + Date.now()
        }

        return `
/**
 * Keys of all generated SVG sprite symbols.
 */
export type NuxtSvgSpriteSymbol =
  | ${type}

export const SPRITE_PATH = '/_nuxt/${fileName}'
export const SYMBOLS = ${JSON.stringify(context.icons)}
`
      },
    })

    // Add an alias for the generated template. This is used inside the
    // SpriteSymbol component to type the props and to get the URL to the
    // sprite.
    nuxt.options.alias['#nuxt-svg-sprite'] = template.dst

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
          await generateSprite()

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
