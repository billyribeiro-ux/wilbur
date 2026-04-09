// ESLint for the SvelteKit app only — run: `pnpm --dir svelte-app run lint` (or `cd svelte-app && pnpm run lint`).
// The React+Vite app uses `/eslint.config.js` at the repo root. Do not merge configs; apps are independent.
import eslint from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import svelteParser from 'svelte-eslint-parser';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: [
			'**/.svelte-kit/**',
			'**/build/**',
			'**/dist/**',
			'**/node_modules/**',
			'**/test-results/**',
			'**/playwright-report/**',
			'**/e2e/**'
		]
	},
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	...svelte.configs['flat/recommended'],
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }
			],
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/class-literal-property-style': 'off',
			'@typescript-eslint/consistent-type-imports': 'off',
			'@typescript-eslint/no-explicit-any': 'warn',
			'svelte/no-navigation-without-resolve': 'off',
			'svelte/require-each-key': 'error',
			'svelte/no-at-html-tags': 'error',
			'svelte/no-unused-svelte-ignore': 'off',
			'svelte/prefer-svelte-reactivity': 'error'
		}
	},
	{
		files: ['**/chat/ChatPanel.svelte'],
		rules: {
			// Body HTML is sanitized with DOMPurify in sanitizeContent() before render.
			'svelte/no-at-html-tags': 'off'
		}
	},
	{
		files: ['**/*.svelte.ts'],
		languageOptions: {
			parser: tseslint.parser
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tseslint.parser,
				extraFileExtensions: ['.svelte']
			}
		}
	}
);
