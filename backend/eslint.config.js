import js from '@eslint/js'
import globals from 'globals'

export default [
  { ignores: ['coverage'] },
  {
    files: ['**/*.js'],
    ...js.configs.recommended,
    languageOptions: { globals: globals.node },
  },
]
