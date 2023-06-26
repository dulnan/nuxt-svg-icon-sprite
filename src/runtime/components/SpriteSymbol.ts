import { defineComponent, PropType, h } from 'vue'
import type { NuxtSvgSpriteSymbol } from '#nuxt-svg-sprite/runtime'
import { SPRITE_PATHS } from '#nuxt-svg-sprite/runtime'

export default defineComponent({
  props: {
    name: String as PropType<NuxtSvgSpriteSymbol>,
    noWrapper: Boolean,
  },
  setup(props) {
    return () => {
      // Split the name, which is either the symbol name of the default sprite
      // (e.g. "user") or prefixed to a custom sprite ("dashboard/billing").
      const [sprite, name] = (props.name || '').split('/')

      // Create the <use> tag.
      const use = h('use', {
        href:
          (SPRITE_PATHS as any)[name ? sprite : 'default'] +
          '#' +
          (name || sprite),
      })

      // Wrap <use> in <svg> if desired.
      return props.noWrapper
        ? use
        : h(
            'svg',
            {
              xmlns: 'http://www.w3.org/2000/svg',
              'data-symbol': (name || sprite),
            },
            use,
          )
    }
  },
})

// Don't have to do anything, just accept.
if (import.meta.hot) {
  import.meta.hot.accept(() => {})
}
