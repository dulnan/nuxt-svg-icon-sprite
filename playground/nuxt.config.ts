import { defineNuxtConfig } from 'nuxt/config'
import nuxtSvgIconSprite from './../src/module'

export default defineNuxtConfig({
  modules: [nuxtSvgIconSprite],

  svgIconSprite: {
    sprites: {
      default: {
        importPatterns: ['./assets/symbols/**/*.svg'],
      },
      special: {
        importPatterns: ['./assets/symbols-special/**/*.svg'],
      },
    },
  },

  css: ['~/assets/css/main.css'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
})
