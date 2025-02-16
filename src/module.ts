import {
  createResolver,
  defineNuxtModule,
  addTemplate,
  addComponent,
  addImportsDir,
  addDevServerHandler,
  addTypeTemplate,
} from '@nuxt/kit'
import { createDevServerHandler } from './module/devServerHandler'
import type { SpriteConfig, RuntimeOptions, ModuleContext } from './types'
import { SymbolCollector } from './module/SymbolCollector'

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

    const buildResolver = createResolver(nuxt.options.buildDir)

    // The path to the source directory of this module's consumer.
    const srcDir = nuxt.options.srcDir

    const srcResolver = createResolver(srcDir)

    // The path of this module.
    const resolver = createResolver(import.meta.url)

    // Add plugin and transpile runtime directory.
    nuxt.options.build.transpile.push(resolver.resolve('runtime'))

    // Add composables.
    addImportsDir(resolver.resolve('runtime/composables'))

    // Add the component.
    addComponent({
      filePath: resolver.resolve('./runtime/components/SpriteSymbol'),
      name: 'SpriteSymbol',
      global: true,
    })

    const runtimeOptions: RuntimeOptions = {
      ariaHidden: !!moduleOptions.ariaHidden,
    }

    const context: ModuleContext = {
      dev: DEV,
      srcDir,
      buildAssetDir: nuxt.options.app.buildAssetsDir,
      runtimeOptions,
      buildResolver,
    }

    const collector = new SymbolCollector(moduleOptions.sprites, context)
    await collector.init()

    if (DEV) {
      // During development the sprite is returned by a server handler.
      addDevServerHandler({
        handler: createDevServerHandler(collector),
        route: '/_nuxt/nuxt-svg-sprite',
      })
    } else {
      collector.sprites.forEach((sprite) => {
        const path =
          'dist/client' +
          nuxt.options.app.buildAssetsDir +
          sprite.getSpriteFileName()
        addTemplate({
          filename: path,
          write: true,
          getContents: async () => {
            const { content } = await sprite.getSprite()
            return content
          },
        })
      })
    }

    // Template containing the types and the relative URL path to the generated
    // sprite.
    const template = addTemplate({
      filename: 'nuxt-svg-sprite/runtime.mjs',
      write: false,
      getContents: () => collector.getRuntimeTemplate(),
    })

    addTypeTemplate({
      filename: 'nuxt-svg-sprite/runtime.d.ts',
      write: true,
      getContents: () => collector.getRuntimeTypeTemplate(),
    })

    const templateData = addTemplate({
      filename: 'nuxt-svg-sprite/data.mjs',
      write: false,
      getContents: () => collector.buildDataTemplate(),
    })

    addTypeTemplate({
      filename: 'nuxt-svg-sprite/data.d.ts',
      write: true,
      getContents: () => collector.buildDataTypeTemplate(),
    })

    const templateSymbolImport = addTemplate({
      filename: 'nuxt-svg-sprite/symbol-import.js',
      // Only write it in build.
      write: !DEV,
      getContents: () => collector.buildSymbolImportTemplate(),
    })

    addTypeTemplate({
      filename: 'nuxt-svg-sprite/symbol-import.d.ts',
      write: true,
      getContents: () => collector.buildSymbolImportTypeTemplate(),
    })

    // Add an alias for the generated template. This is used inside the
    // SpriteSymbol component to type the props and to get the URL to the
    // sprite.
    nuxt.options.alias['#nuxt-svg-sprite/runtime'] = template.dst
    nuxt.options.alias['#nuxt-svg-sprite/data'] = templateData.dst
    nuxt.options.alias['#nuxt-svg-sprite/symbol-import'] =
      templateSymbolImport.dst

    nuxt.hook('builder:watch', async (event, pathRelative) => {
      // We only care about SVG files.
      if (!pathRelative.match(/\.(svg)$/)) {
        return
      }

      const path = srcResolver.resolve(pathRelative)

      if (event === 'add') {
        await collector.handleAdd(path)
      } else if (event === 'change') {
        await collector.handleChange(path)
      } else if (event === 'unlink') {
        await collector.handleUnlink(path)
      } else if (event === 'addDir') {
        await collector.handleAddDir(path)
      } else if (event === 'unlinkDir') {
        await collector.handleUnlinkDir(path)
      }
    })
  },
})
