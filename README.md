# Nuxt SVG Icon Sprite

Easy and performant way to use SVG icons in your Nuxt 3 app.

Automatically creates [SVG `<symbol>`
sprites](https://www.sitepoint.com/use-svg-image-sprites/) during build and
provides components and composables to use symbols.

- Aggregate all SVG files into a one or more sprite files
- Reduce bundle size and SSR rendered page size
- Full HMR support
- Provides `<SpriteSymbol>` component to render `<svg>` with `<use>`
- Loads the sprite.svg from URL (/_nuxt/sprite.svg)
- Typescript type checking for available symbols

## Install

```bash
npm install --save nuxt-svg-icon-sprite
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

## Usage

Place the icons in the folder defined in nuxt.config.ts, by default it's
`./assets/icons`. The name of the SVG files is used to determine the symbol
name.

**NOTE: Per sprite each symbol must have an unique name!**

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

## Multiple Sprites

If you have a lot of icons it might make sense to split them into separate
sprites.

A typical example would be to have SVGs that appear on every page (navbar,
logo, footer, etc.) in the "default" sprite and put page-specific SVGs in
separate sprites.

To create an additional sprite just define a new property on the `sprites`
config object:

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-svg-icon-sprite'],

  svgIconSprite: {
    sprites: {
      default: {
        importPatterns: ['./assets/icons/**/*.svg'],
      },
      dashboard: {
        importPatterns: ['./assets/icons-dashboard/**/*.svg'],
      },
    },
  },
})
```

Assuming you have this file `~/assets/icons-dashboard/billing.svg`, you can
reference it like this:

```vue
<SpriteSymbol name="dashboard/billing" />
```

The symbol name is prefixed by the name of the sprite (e.g. the key used in the
`sprites` config). The `default` sprite is always unprefixed.

## `<SpriteSymbol>` component

In addition to the `name` prop you can also optionally pass the `noWrapper`
prop to only render the `<use>` tag:

```vue
<SpriteSymbol name="dashboard/billing" :no-wrapper="true" />
```

This will render the following markup:

```html
<use xlink:href="/_nuxt/sprite-dashboard.svg#billing"></use>
```

This is useful if you want to render multiple symbols in one `<svg>` tag.

## `useSpriteData()` composable

Get information about the generated sprites and their symbols during runtime.

Useful if you want to render a list of all 

## TODO

- Provide more information about generated sprite via composable
- Provide option to inline sprite in SSR
- Docs
- Tests
