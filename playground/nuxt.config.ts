import { defineNuxtConfig } from 'nuxt/config'
import nuxtSvgIconSprite from './../src/module'

export default defineNuxtConfig({
  modules: [nuxtSvgIconSprite],

  routeRules: {
    '/spa/**': { ssr: false },
  },

  svgIconSprite: {
    sprites: {
      default: {
        importPatterns: [
          './assets/symbols/**/*.svg',
          './asdfasdfasdf/**/*.svg',
        ],
        symbols: {
          email: '~/assets/email.svg',
          foobar: '~/assets/emailfoobar.svg',
        },
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
