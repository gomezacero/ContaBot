import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Ambiente de testing
    environment: 'happy-dom',

    // Archivos de setup globales
    setupFiles: ['./test/setup.ts'],

    // Incluir archivos de test
    include: ['**/*.{test,spec}.{ts,tsx}'],

    // Excluir directorios
    exclude: [
      'node_modules',
      '.next',
      'prototipos',
      'contabio-landing-pagev2'
    ],

    // Cobertura de código
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'lib/**/*.ts',
        'components/**/*.tsx',
        'app/api/**/*.ts'
      ],
      exclude: [
        'lib/supabase/**',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts'
      ],
      thresholds: {
        // Umbrales mínimos de cobertura
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70
      }
    },

    // Globals para no importar describe, it, expect en cada archivo
    globals: true,

    // Timeout para tests async
    testTimeout: 10000,

    // Reporter
    reporters: ['verbose'],
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
})
