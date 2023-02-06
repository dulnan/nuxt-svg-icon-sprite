# Nuxt SVG Icon Sprite

Module for Nuxt 3 to automatically create a **SVG `<symbol>` sprite**.
Currently in a beta, open for feedback and breaking changes!

- Aggregate all SVG files into a single sprite file
- Reduce bundle size and SSR rendered page size
- Full HMR support
- Provides `<SpriteSymbol>` component to render `<svg>` with `<use>`
- Loads the sprite.svg from URL (/_nuxt/sprite.svg)
- Typescript type checking for available symbols

## Install

```bash
npm install --save nuxt-svg-icon-sprite@beta
```

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-svg-icon-sprite'],

  svgIconSprite: {
    sprites: {
      default: {
        importPatterns: ['./assets/icons/**/*.svg'],
      },
    },
  },
})
```

Currently only a single sprite is generated, but support for multiple sprites
will be implemented. The `svgIconSprite.sprites` config will contain keys for
each sprite to be generated. The `default` key is the only one supported
currently.

## Usage

Place the icons in the folder defined in nuxt.config.ts, by default it's
`./assets/icons`. The name of the SVG files is used to determine the symbol
name.

So, if you have a file in `./assets/icons/user.svg` the sprite will contain a
<symbol> with id `user`.

You can now use the symbol using the provided component:

```vue
<SpriteSymbol name="user" />
```

This will render the following markup:

```html
<svg>
  <use xlink:href="/_nuxt/sprite.svg#user"></use>
</svg>
```

The symbol is referenced from the sprite via URL.

## TODO

- Support multiple sprites
- Remove large dependency on svg-sprite
- Provide more information about generated sprite via composable
- Provide option to inline sprite in SSR
- Docs
- Tests
- Separate component to only render `<use>` without `<svg>`
