import path from 'path'

const importPattern = path.resolve(__dirname, './assets/symbols') + '/**/*.svg'

export default defineNuxtConfig({
  modules: ['./../src/module'],

  imports: {
    autoImport: false,
  },

  routeRules: {
    '/spa/**': { ssr: false },
  },

  svgIconSprite: {
    sprites: {
      default: {
        importPatterns: [importPattern],
        symbolFiles: {
          email: '~/assets/email.svg',
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
