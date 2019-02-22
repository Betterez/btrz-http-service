module.exports = {
  root: true,
  // https://github.com/feross/standard/blob/master/RULES.md#javascript-standard-style
  extends: "eslint:recommended",
  // required to lint *.vue files
  plugins: [
    "mocha"
  ],
  "parserOptions": {
    "ecmaVersion": 8,
    "sourceType": "module",
    "ecmaFeatures": {
      "experimentalObjectRestSpread": true
    }
  },
  "globals": {
    "_": true,
    "ich": true,
    "Formatter": true,
    "describe": true,
    "before": true,
    "beforeEach": true,
    "after": true,
    "afterEach": true,
    "it": true
  },
  "env": {
    "es6": true,
    "node": true
  },
  // add your custom rules here
  "rules": {
    // Mocha
    "mocha/handle-done-callback": 2,
    "mocha/no-global-tests": 2,


    "array-callback-return": 2,
    "consistent-return": 2,
    "curly": 2,
    "eqeqeq": 2,
    "no-alert": 1,
    // disallow use of arguments.caller or arguments.callee
    "no-caller": 2,
    // disallow lexical declarations in case/default clauses
    "no-case-declarations": 2,
    // disallow division operators explicitly at beginning of regular expression
    "no-div-regex": 0,
    // disallow else after a return in an if
    "no-else-return": 2,
    // disallow empty functions, except for standalone funcs/arrows
    "no-empty-function": [2, {
      "allow": [
        "functions",
        "arrowFunctions",
      ]
    }],
    "no-empty-pattern": 2,
    "no-eval": 2,
    "no-extend-native": 2,
    "no-extra-bind": 2,
    "no-implicit-coercion": 2,
    "no-implicit-globals": 2,
    "no-implied-eval": 2,
    "no-multi-spaces": 2,
    "no-loop-func": 2,
    "no-multi-str": 2,
    "no-native-reassign": 2,
    "no-new-wrappers": 2,
    "no-octal": 2,
    "no-octal-escape": 2,
    "no-param-reassign": 2,
    "no-redeclare": 2,
    "no-return-assign": 2,
    "no-script-url": 2,
    "no-self-assign": 2,
    "no-self-compare": 2,
    "no-sequences": 2,
    "no-throw-literal": 2,
    "no-unused-expressions": 2,
    "no-unused-labels": 2,
    "no-useless-concat": 2,
    "no-useless-escape": 2,
    "no-void": 2,
    "no-warning-comments": 2,
    "no-with": 2,
    "radix": 2,
    "vars-on-top": 2,
    "wrap-iife": 2,
    "yoda": 2,

    // Variables
    //  require or disallow initialization in var declarations
    "init-declarations": 2,
    //  disallow catch clause parameters from shadowing variables in the outer scope
    "no-catch-shadow": 2,
    //  disallow deleting variables
    "no-delete-var": 2,
    //  disallow labels that share a name with a variable
    "no-label-var": 2,
    //  disallow specified global variables
    "no-restricted-globals": 2,
    //  disallow var declarations from shadowing variables in the outer scope
    "no-shadow": 2,
    //  disallow identifiers from shadowing restricted names
    "no-shadow-restricted-names": 2,
    //  disallow the use of undeclared variables unless mentioned in /*global */ comments
    "no-undef": 2,
    //  disallow initializing variables to undefined
    "no-undef-init": 0,
    //  disallow the use of the undefined Variable
    "no-undefined": 0,
    //  disallow unused variables
    "no-unused-vars": 2,
    //  disallow the use of variables before they are defined
    "no-use-before-define": 2,

    //NODE
    // require return statements after callbacks
    "callback-return": 2,
    // require require() calls to be placed at top-level module scope
    "global-require": 0,
    // require error handling in callbacks
    "handle-callback-err": [2, "^(err|error)$"],
    // disallow require calls to be mixed with regular var declarations
    "no-mixed-requires": 0,
    // disallow new operators with calls to require
    "no-new-require": 2,
    // disallow string concatenation with __dirname and __filename
    "no-path-concat": 0,
    // disallow the use of process.env
    "no-process-env": 0,
    // disallow the use of process.exit()
    "no-process-exit": 0,
    // disallow synchronous methods
    "no-sync": 0,

    //STYLES:
    // enforce consistent spacing inside array brackets
    "array-bracket-spacing": [2, "never"],
    // enforce consistent spacing inside single-line blocks
    "block-spacing": 2,
    // enforce consistent brace style for blocks
    "brace-style": 2,
    // enforce camelcase naming convention
    "camelcase": 2,
    // enforce consistent spacing before and after commas
    "comma-spacing": 2,
    // enforce consistent comma style
    "comma-style": 2,
    // enforce consistent spacing inside computed property brackets
    "computed-property-spacing": 2,
    // enforce consistent naming when capturing the current execution context
    "consistent-this": [2, "self"],
    // enforce at least one newline at the end of files
    "eol-last": 2,
    // enforce named function expressions
    "func-names": 2,
    // enforce the consistent use of either function declarations or expressions
    "func-style": [2, "declaration"],
    // disallow specified identifiers
    "id-blacklist": 2,
    // enforce minimum and maximum identifier lengths
    "id-length": 0,
    // require identifiers to match a specified regular expression
    "id-match": 0,
    // enforce consistent indentation
    "indent": ["error", 2],
    // enforce the consistent use of either double or single quotes in JSX attributes
    "jsx-quotes": 2,
    // enforce consistent spacing between keys and values in object literal properties
    "key-spacing": 2,
    // enforce consistent spacing before and after keywords
    "keyword-spacing": 2,
    // enforce consistent linebreak style
    "linebreak-style": 2,
    // require empty lines around comments
    "lines-around-comment": 2,
    // enforce a maximum depth that blocks can be nested
    "max-depth": 2,
    // enforce a maximum line length
    "max-len": [2, {"code": 140, "tabWidth": 2, "ignoreUrls": true}],
    // enforce a maximum depth that callbacks can be nested
    "max-nested-callbacks": 2,
    // enforce a maximum number of parameters in function definitions
    "max-params": [2, 4],
    // enforce a maximum number of statements allowed in function blocks
    "max-statements": [2, 30],
    // enforce a maximum number of statements allowed per line
    "max-statements-per-line": 2,
    // require constructor function names to begin with a capital letter
    "new-cap": 2,
    // require parentheses when invoking a constructor with no arguments
    "new-parens": 2,
    // require or disallow an empty line after var declarations
    "newline-after-var": 0,
    // require an empty line before return statements
    "newline-before-return": 0,
    // require a newline after each call in a method chain
    "newline-per-chained-call": 2,
    // disallow Array constructors
    "no-array-constructor": 2,
    // disallow bitwise operators
    "no-bitwise": 2,
    // disallow continue statements
    "no-continue": 2,
    // disallow inline comments after code
    "no-inline-comments": 2,
    // disallow if statements as the only statement in else blocks
    "no-lonely-if": 2,
    // disallow mixed spaces and tabs for indentation
    "no-mixed-spaces-and-tabs": 2,
    // disallow multiple empty lines
    "no-multiple-empty-lines": 2,
    // disallow negated conditions
    "no-negated-condition": 0,
    // disallow nested ternary expressions
    "no-nested-ternary": 2,
    // disallow Object constructors
    "no-new-object": 2,
    // disallow the unary operators ++ and --
    "no-plusplus": 0,
    // disallow specified syntax
    "no-restricted-syntax": 2,
    // disallow spacing between function identifiers and their applications
    "no-spaced-func": 2,
    // disallow ternary operators
    "no-ternary": 0,
    // disallow trailing whitespace at the end of lines
    "no-trailing-spaces": 0,
    // disallow dangling underscores in identifiers
    "no-underscore-dangle": 0,
    // disallow ternary operators when simpler alternatives exist
    "no-unneeded-ternary": 1,
    // disallow whitespace before properties
    "no-whitespace-before-property": 2,
    // enforce consistent spacing inside braces
    "object-curly-spacing": 2,
    // enforce variables to be declared either together or separately in functions
    "one-var": [2, "never"],
    // require or disallow newlines around var declarations
    "one-var-declaration-per-line": 2,
    // require or disallow assignment operator shorthand where possible
    "operator-assignment": 2,
    // enforce consistent linebreak style for operators
    "operator-linebreak": 2,
    // require or disallow padding within blocks
    "padded-blocks": [2, "never"],
    // require quotes around object literal property names
    "quote-props": 0,
    // enforce the consistent use of either backticks, double, or single quotes
    "quotes": 2,
    // require JSDoc comments
    "require-jsdoc": 0,
    // require or disallow semicolons instead of ASI
    "semi": [2, "always"],
    // enforce consistent spacing before and after semicolons
    "semi-spacing": 2,
    // enforce sorted import declarations within module
    "sort-imports": 0,
    // require variables within the same declaration block to be sorted
    "sort-vars": 0,
    // enforce consistent spacing before blocks
    "space-before-blocks": 2,
    // enforce consistent spacing before function definition opening parenthesis
    "space-before-function-paren": [2, { "anonymous": "always", "named": "never" }],
    // enforce consistent spacing inside parentheses
    "space-in-parens": 2,
    // require spacing around operators
    "space-infix-ops": 2,
    // enforce consistent spacing before or after unary operators
    "space-unary-ops": 2,
    // enforce consistent spacing after the // or /* in a comment
    "spaced-comment": 2,
    // require parenthesis around regex literals
    "wrap-regex": 0,

    // ES6
    // require braces around arrow function bodies
    "arrow-body-style": [2, "always"],
    // require parentheses around arrow function arguments
    "arrow-parens": 2,
    // enforce consistent spacing before and after the arrow in arrow functions
    "arrow-spacing": 2,
    // require super() calls in constructors
    "constructor-super": 2,
    // enforce consistent spacing around * operators in generator functions
    "generator-star-spacing": 2,
    // disallow reassigning class members
    "no-class-assign": 2,
    // disallow arrow functions where they could be confused with comparisons
    "no-confusing-arrow": 2,
    // disallow reassigning const variables
    "no-const-assign": 2,
    // disallow duplicate class members
    "no-dupe-class-members": 2,
    // disallow duplicate module imports
    "no-duplicate-imports": 2,
    // disallow new operators with the Symbol object
    "no-new-symbol": 2,
    // disallow specified modules when loaded by import
    "no-restricted-imports": 2,
    // disallow this/super before calling super() in constructors
    "no-this-before-super": 2,
    // disallow unnecessary constructors
    "no-useless-constructor": 2,
    // require let or const instead of var
    "no-var": 2,
    // require or disallow method and property shorthand syntax for object literals
    "object-shorthand": 2,
    // require arrow functions as callbacks
    "prefer-arrow-callback": 2,
    // require const declarations for variables that are never reassigned after declared
    "prefer-const": 2,
    // require Reflect methods where applicable
    "prefer-reflect": 2,
    // require rest parameters instead of arguments
    "prefer-rest-params": 2,
    // require spread operators instead of .apply()
    "prefer-spread": 2,
    // require template literals instead of string concatenation
    "prefer-template": 2,
    // require generator functions to contain yield
    "require-yield": 2,
    // require or disallow spacing around embedded expressions of template strings
    "template-curly-spacing": 2,
    // require or disallow spacing around the * in yield* expressions
    "yield-star-spacing": 2,

    "no-console": process.env.NODE_ENV === "production" ? 2 : 0,
    "no-debugger": process.env.NODE_ENV === "production" ? 2 : 0
  }
};
