import js from '@eslint/js';
import globals from 'globals';
import hooks from 'eslint-plugin-react-hooks';
export default [
  { ignores: ['dist/**','node_modules/**'] },
  { files:['src/{domain,application,infrastructure,bootstrap,presentation,workspace}/**/*.{js,jsx}','src/main.jsx','test/**/*.mjs'],
    languageOptions:{ecmaVersion:'latest',sourceType:'module',parserOptions:{ecmaFeatures:{jsx:true}},globals:{...globals.browser,...globals.node}},
    plugins:{'react-hooks':hooks},
    rules:{...js.configs.recommended.rules,'no-unused-vars':['error',{varsIgnorePattern:'^[A-Z]',argsIgnorePattern:'^_',caughtErrorsIgnorePattern:'^_'}],'react-hooks/rules-of-hooks':'error'} },
];
