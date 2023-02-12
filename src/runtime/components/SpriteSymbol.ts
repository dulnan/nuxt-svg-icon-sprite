import { defineComponent, PropType } from 'vue'
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
        'xlink:href':
          (SPRITE_PATHS as any)[name ? sprite : 'default'] +
          '#' +
          (name || sprite),
      })
      return props.noWrapper ? use : h('svg', use)
    }
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(() => {})
}
