module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "globals": {
      "expect": true,
      "it": true,
      "describe": true,
    },
  'parser': '@typescript-eslint/parser',
    "parserOptions": {
      'jsx': true,
      'useJSXTextNode': true
    },
  'extends': [
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'eslint:recommended'
    ],
    "rules": {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
        "no-unused-vars": 2,
        "react/jsx-uses-vars": 2,
        "react/jsx-uses-react": 2,
        "indent": [
            "error",
            2
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ],
      'jsx-quotes': [
        'error',
        'prefer-single'
      ],
      'no-multiple-empty-lines': [
        'error',
        {
          'max': 1
        }
      ],
      'comma-dangle': [
        'error',
        'never'
      ]
    }
};
