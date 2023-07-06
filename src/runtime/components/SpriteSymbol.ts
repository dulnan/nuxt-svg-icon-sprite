import { defineComponent, PropType, h, createVNode, Static } from 'vue'
import type { NuxtSvgSpriteSymbol } from '#nuxt-svg-sprite/runtime'
import { SPRITE_PATHS } from '#nuxt-svg-sprite/runtime'
import { ALL_SYMBOL_DOMS } from '#nuxt-svg-sprite/data'

export default defineComponent({
  props: {
    name: String as PropType<NuxtSvgSpriteSymbol>,
    noWrapper: Boolean,
    inline: Boolean,
  },
  setup(props) {
    return () => {
      // Split the name, which is either the symbol name of the default sprite
      // (e.g. "user") or prefixed to a custom sprite ("dashboard/billing").
      const [sprite, name] = (props.name || '').split('/')

      const symbolKey = (name || sprite)

      if (props.inline) {
        if (props.noWrapper) {
          return createVNode(Static, {}, ALL_SYMBOL_DOMS[symbolKey]?.dom)
        }

        const attributes = ALL_SYMBOL_DOMS[symbolKey]?.attributes || {}
        attributes.id = null // Overwrite ID in case it's set to avoid setting duplicate IDs on the same page.

        return h(
          'svg',
          {
            xmlns: 'http://www.w3.org/2000/svg',
            'data-symbol': (name || sprite),
            ...attributes,
            innerHTML: ALL_SYMBOL_DOMS[symbolKey]?.dom,
            id: null,
          }
        )
      }

      // Create the <use> tag.
      const symbolDom = h('use', {
        href:
          (SPRITE_PATHS as any)[name ? sprite : 'default'] +
          '#' +
          (name || sprite),
      })

      // Wrap DOM in <svg> if desired.
      return props.noWrapper
        ? symbolDom
        : h(
            'svg',
            {
              xmlns: 'http://www.w3.org/2000/svg',
              'data-symbol': (name || sprite),
            },
            symbolDom,
          )
    }
  },
})

// Don't have to do anything, just accept.
if (import.meta.hot) {
  import.meta.hot.accept(() => {})
}
