import path from 'path'

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
        processSpriteSymbol: function (svg) {
          svg.removeAttribute('width')
          svg.removeAttribute('height')

          const allElements = svg.querySelectorAll('*')
          const colorAttributes = ['stroke', 'fill']
          if (svg.hasAttribute('data-keep-color')) {
            return
          }
          allElements.forEach((element) => {
            colorAttributes.forEach((attribute) => {
              const value = element.getAttribute(attribute)
              if (value) {
                element.setAttribute(attribute, 'currentColor')
              }
            })
          })
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
