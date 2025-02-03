<template>
  <svg
    v-if="inline"
    v-bind="inlineProps.attrs"
    v-html="inlineProps.svgDom"
  ></svg>
  <use v-else-if="noWrapper" :href="href"></use>
  <svg
    v-else
    xmlns="http://www.w3.org/2000/svg"
    data-symbol="nameOrSprite"
    :aria-hidden="runtimeOptions.ariaHidden"
  >
    <use :href="href"></use>
  </svg>
</template>

<script setup lang="ts">
import { type PropType, computed, watch, reactive } from 'vue'
import { SYMBOL_IMPORTS } from '#nuxt-svg-sprite/symbol-import'
import type { NuxtSvgSpriteSymbol } from '#nuxt-svg-sprite/runtime'
import { SPRITE_PATHS, runtimeOptions } from '#nuxt-svg-sprite/runtime'

const props = defineProps({
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
})

const nameParts = computed(() => (props.name || '').split('/'))
const nameOrSprite = computed(() => nameParts.value[nameParts.value.length - 1])
const href = computed(() => {
  const sprite = (SPRITE_PATHS as any)[
    nameParts.value.length > 1 ? nameParts.value[0] : 'default'
  ]

  return sprite + '#' + nameOrSprite.value
})

const inlineProps = reactive({
  attrs: {},
  svgDom: '',
})

const buildInlineProps = async () => {
  if (!props.inline) {
    return
  }
  const symbolImport = SYMBOL_IMPORTS[props.name]
  if (!symbolImport) {
    return
  }

  const data = await symbolImport.import()
  const attributes = symbolImport.attributes
  // Overwrite ID in case it's set to avoid setting duplicate IDs on the same page.
  attributes.id = ''

  // Extract the contents of the SVG (everything between <svg> and </svg>)
  inlineProps.svgDom = data.match(/<svg[^>]*>((.|[\r\n])*?)<\/svg>/im)?.[1]

  inlineProps.attrs = {
    xmlns: 'http://www.w3.org/2000/svg',
    'data-symbol': nameOrSprite.value,
    ...attributes,
    id: null,
    'aria-hidden': runtimeOptions.ariaHidden ? 'true' : undefined,
  }
}

// Awaiting the buildInlineProps function breaks the module when more than ~50 symbols are imported
// So just call it directly
watch(
  () => props.name,
  () => {
    buildInlineProps()
  },
  { immediate: true },
)
</script>
