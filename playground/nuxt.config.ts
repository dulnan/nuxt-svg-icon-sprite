import path from 'path'
import { parse } from 'node-html-parser'

const importPattern = path.resolve(__dirname, './assets/symbols') + '/**/*.svg'

export default defineNuxtConfig({
  modules: ['./../src/module'],

  debug: false,

  imports: {
    autoImport: false,
  },

  routeRules: {
    '/spa/**': { ssr: false },
  },

  vite: {
    server: {
      watch: {
        usePolling: true,
      },
    },
  },

  svgIconSprite: {
    sprites: {
      default: {
        importPatterns: [importPattern],
        symbolFiles: {
          email: '~/assets/email.svg',
        },
        processSvg: function (markup) {
          const parsed = parse(markup)
          const svg = parsed.querySelector('svg')
          if (!svg) {
            return ''
          }

          svg.removeAttribute('width')
          svg.removeAttribute('height')

          const allElements = parsed.querySelectorAll('*')
          const colorAttributes = ['stroke', 'fill']
          allElements.forEach((element) => {
            colorAttributes.forEach((attribute) => {
              const value = element.getAttribute(attribute)
              if (value) {
                element.setAttribute(attribute, 'currentColor')
              }
            })
          })
          return svg.toString()
        },
      },
      special: {
        importPatterns: ['./assets/symbols-special/**/*.svg'],
      },
    },
    ariaHidden: true,
  },

  css: ['~/assets/css/main.css'],

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  compatibilityDate: '2024-08-25',
})
