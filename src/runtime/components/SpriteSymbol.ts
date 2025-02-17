import { defineComponent, type PropType, h } from 'vue'
import type { NuxtSvgSpriteSymbol } from '#nuxt-svg-sprite/runtime'
import { SPRITE_PATHS, runtimeOptions } from '#nuxt-svg-sprite/runtime'
import { SYMBOL_IMPORTS } from '#nuxt-svg-sprite/symbol-import'
import { useHead } from '#imports'

const SymbolInline = defineComponent({
  props: {
    name: {
      type: String as PropType<NuxtSvgSpriteSymbol>,
      required: true,
    },
  },
  async setup(props) {
    const [sprite, name] = (props.name || '').split('/')
    const symbolImport = SYMBOL_IMPORTS[props.name]

    // Invalid symbol name.
    if (!symbolImport) {
      return () =>
        h('svg', {
          'data-symbol': name || sprite,
          xmlns: 'http://www.w3.org/2000/svg',
          innerHTML: '',
          'aria-hidden': runtimeOptions.ariaHidden ? 'true' : undefined,
        })
    }

    // It's either a method that imports it using import() (client side) or
    // the object itself (server side).
    const symbol =
      typeof symbolImport === 'function' ? await symbolImport() : symbolImport

    return () =>
      h('svg', {
        'data-symbol': name || sprite,
        // Pass the attributes from the raw SVG (things like viewBox).
        // Attributes passed to <SpriteSymbol> are automatically added by Vue.
        ...symbol.attributes,
        xmlns: 'http://www.w3.org/2000/svg',
        innerHTML: symbol.content,
        id: undefined,
        'aria-hidden': runtimeOptions.ariaHidden ? 'true' : undefined,
      })
  },
})

/**
 * Renders a <svg> tag containing <use> that references the given symbol from the sprite.
 */
export default defineComponent({
  props: {
    /**
     * The name of the symbol.
     *
     * Symbols from the default sprite can be referenced directly by their name,
     * e.g. `name="settings"`.
     * Symbols from other sprites must be prefixed by their sprite name, e.g.
     * `name="special/search"`
     */
    name: {
      type: String as PropType<NuxtSvgSpriteSymbol>,
      required: true,
    },

    /**
     * If set, the markup of the SVG is directly inlined, with both the
     * attributes of the SVG and the attributes passed to the component.
     *
     * When set to true, the noWrapper prop is ignored.
     */
    inline: Boolean,

    /**
     * If set, the component does not render a <svg> wrapper.
     *
     * If inline is set to `true`, this prop is ignored.
     */
    noWrapper: Boolean,
  },
  setup(props) {
    if (import.meta.server && !props.inline) {
      const [sprite, name] = (props.name || '').split('/')
      const href = SPRITE_PATHS[name ? sprite : 'default']
      if (href) {
        useHead({
          link: [
            {
              rel: 'prefetch',
              href,
              as: 'image',
              type: 'image/svg+xml',
            },
          ],
        })
      }
    }

    return () => {
      if (props.inline) {
        return h(SymbolInline, { name: props.name, key: props.name })
      }

      // Split the name, which is either the symbol name of the default sprite
      // (e.g. "user") or prefixed to a custom sprite ("dashboard/billing").
      const [sprite, name] = (props.name || '').split('/')

      // Create the <use> tag.
      const symbolDom = h('use', {
        href: SPRITE_PATHS[name ? sprite : 'default'] + '#' + (name || sprite),
      })

      return props.noWrapper
        ? symbolDom
        : h(
            'svg',
            {
              xmlns: 'http://www.w3.org/2000/svg',
              'data-symbol': name || sprite,
              'aria-hidden': runtimeOptions.ariaHidden ? 'true' : undefined,
            },
            symbolDom,
          )
    }
  },
})

if (import.meta.hot) {
  import.meta.hot.accept()
}
