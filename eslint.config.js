import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

/**
 * Flat ESLint config:
 * - JS + Vue 3 correctness rules (`flat/essential`, the same base create-vue
 *   ships with), no stylistic rules — Prettier owns formatting.
 * - `eslint-config-prettier` last so no rule fights the formatter.
 * - shadcn-vue primitives under src/components/ui are generated and are
 *   ignored, matching .prettierignore.
 */
export default [
    {
        name: 'app/files-to-ignore',
        ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'src/components/ui/**'],
    },
    js.configs.recommended,
    ...pluginVue.configs['flat/essential'],
    {
        name: 'app/language-options',
        files: ['**/*.{js,vue}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                defineProps: 'readonly',
                defineEmits: 'readonly',
                defineExpose: 'readonly',
                defineModel: 'readonly',
                defineOptions: 'readonly',
                defineSlots: 'readonly',
            },
        },
    },
    {
        name: 'app/config-files',
        files: ['*.config.js', 'eslint.config.js'],
        languageOptions: {
            globals: { ...globals.node },
        },
    },
    {
        name: 'app/tests',
        files: ['tests/**/*.js'],
        languageOptions: {
            globals: { ...globals.vitest },
        },
    },
    prettier,
]
