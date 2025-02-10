import {
  createResolver,
  defineNuxtModule,
  updateTemplates,
  addTemplate,
  addComponent,
  addImportsDir,
} from '@nuxt/kit'
import type { SpriteConfig, ModuleContext, RuntimeOptions } from './types'
import {
  buildRuntimeTemplate,
  buildDataTemplate,
  generateSprite,
  getSpriteFileName,
  getAllHashes,
  buildSymbolImportTemplate,
} from './utils'

/**
 * Options for the nuxt-svg-icon-sprite module.
 */
export type ModuleOptions = {
  /**
   * Define the config for each sprite to generate.
   *
   * If a sprite with name `default` is provided the names won't be prefixed.
   */
  sprites: Record<string, SpriteConfig>

  /**
   * Adds aria-hidden="true" to all rendered SVGs.
   */
  ariaHidden?: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-svg-icon-sprite',
    configKey: 'svgIconSprite',
    compatibility: {
      nuxt: '^3.9.0',
    },
  },
  defaults: {
    sprites: {},
    ariaHidden: false,
  },
  async setup(moduleOptions, nuxt) {
    const DEV = nuxt.options.dev
    if (!moduleOptions.sprites.default) {
      moduleOptions.sprites.default = {
        importPatterns: ['./assets/symbols/*.svg'],
      }
    }

    // The path to the source directory of this module's consumer.
    const srcDir = nuxt.options.srcDir

    // The path of this module.
    const resolver = createResolver(import.meta.url)

    // Add plugin and transpile runtime directory.
    nuxt.options.build.transpile.push(resolver.resolve('runtime'))

    // Add composables.
    addImportsDir(resolver.resolve('runtime/composables'))

    // Add the component.
    await addComponent({
      filePath: resolver.resolve('./runtime/components/SpriteSymbol'),
      name: 'SpriteSymbol',
      global: true,
    })

    const spriteKeys = Object.keys(moduleOptions.sprites)

    // Keeps track of the current generated sprite data.
    const context: ModuleContext = spriteKeys.reduce<ModuleContext>(
      (acc, v) => {
        acc[v] = undefined
        return acc
      },
      {},
    )

    // Generate all sprites and update module context.
    function generateAllSprites() {
      return Promise.all(
        spriteKeys.map(async (key) => {
          // Generate sprite initially.
          context[key] = await generateSprite(
            key,
            moduleOptions.sprites[key],
            srcDir,
            DEV,
          )
        }),
      )
    }

    // Initially generate all sprites.
    await generateAllSprites()

    // Add template for each sprite.
    spriteKeys.forEach((key) => {
      // Add the template for the SVG sprite.
      addTemplate({
        filename:
          'dist/client' +
          nuxt.options.app.buildAssetsDir +
          getSpriteFileName(key, context[key]?.hash, DEV),
        write: true,
        options: {
          nuxtSvgSprite: true,
        },
        getContents: () => {
          return context[key]?.content || ''
        },
      })
    })

    const runtimeOptions: RuntimeOptions = {
      ariaHidden: !!moduleOptions.ariaHidden,
    }

    // Template containing the types and the relative URL path to the generated
    // sprite.
    const template = addTemplate({
      filename: 'nuxt-svg-sprite/runtime.ts',
      write: true,
      options: {
        nuxtSvgSprite: true,
      },
      getContents: () => {
        return buildRuntimeTemplate(
          context,
          DEV,
          runtimeOptions,
          nuxt.options.app.buildAssetsDir,
        )
      },
    })

    const templateData = addTemplate({
      filename: 'nuxt-svg-sprite/data.ts',
      write: true,
      options: {
        nuxtSvgSprite: true,
      },
      getContents: () => {
        return buildDataTemplate(context)
      },
    })

    const templateSymbolImport = addTemplate({
      filename: 'nuxt-svg-sprite/symbol-import.ts',
      write: true,
      options: {
        nuxtSvgSprite: true,
      },
      getContents: () => {
        return buildSymbolImportTemplate(context)
      },
    })

    // Add an alias for the generated template. This is used inside the
    // SpriteSymbol component to type the props and to get the URL to the
    // sprite.
    nuxt.options.alias['#nuxt-svg-sprite/runtime'] = template.dst
    nuxt.options.alias['#nuxt-svg-sprite/data'] = templateData.dst
    nuxt.options.alias['#nuxt-svg-sprite/symbol-import'] =
      templateSymbolImport.dst

    if (DEV) {
      nuxt.hook('vite:serverCreated', (viteServer) => {
        // Watch for file changes in dev mode.
        nuxt.hook('builder:watch', async (event, path) => {
          // We only care about SVG files.
          if (!path.match(/\.(svg)$/)) {
            return
          }

          const hashBefore = getAllHashes(context)
          await generateAllSprites()
          const hashAfter = getAllHashes(context)

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
