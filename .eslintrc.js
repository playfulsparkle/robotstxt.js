module.exports = {
    extends: ["eslint:recommended"],
    env: {
        node: true,
        es6: true
    },
    rules: {
        // Enforce 4-space indentation
        indent: ["error", 4, { SwitchCase: 1 }],

        // Require semicolons
        semi: ["error", "always"],

        // Enforce the consistent use of single quotes for strings
        "quotes": ["error", "single"],

        // Disallow the use of console
        "no-console": "error",

        // Require camelCase for variable and function names
        "camelcase": ["error", { properties: "always" }],

        // Disallow the use of `var`, encourage `let` or `const`
        "no-var": "error",

        // Ensure all `let` and `const` variables are used
        "no-unused-vars": ["error", { args: "none" }],

        // Require default case in switch statements
        "default-case": "error",

        // Disallow use of `eval()`
        "no-eval": "error",

        // Ensure that all functions have return type declarations if needed
        "consistent-return": "error",

        // Disallow function declarations that are not used
        "no-unused-function": "error",

        // Require strict equality (===) instead of equality (==)
        "eqeqeq": "error",

        // Disallow the use of `arguments.callee`
        "no-caller": "error",

        // Enforce use of `const` for variables that are never reassigned
        "prefer-const": "error",

        // Require the use of `let` or `const` instead of `var`
        "no-redeclare": "error",

        // Avoid using `setTimeout` or `setInterval` with strings
        "no-eval": "error",

        // Require arrow functions for callbacks or functions that don't require `this`
        "prefer-arrow-callback": "error",

        // Disallow `for` loops with async functions
        "no-await-in-loop": "error",

        // Enforce use of template literals over string concatenation
        "prefer-template": "error",

        // Require a new line at the end of file
        "eol-last": ["error", "always"],

        // Enforce spacing around operators
        "space-infix-ops": "error",

        // Require using `===` instead of `==`
        "eqeqeq": "error",

        // Enforce consistent function declaration styles (function vs. arrow function)
        "func-style": ["error", "expression"],

        // Prevent the use of the `with` statement
        "no-with": "error",

        // Prefer `const` over `let` for constants that don't change
        "prefer-const": "error",

        // Require all promises to be returned or chained
        "no-promise-executor-return": "error",

        // Disallow the use of `alert`, `confirm`, and `prompt`
        "no-alert": "error",

        // Enforce that `this` is used consistently in class methods
        "class-methods-use-this": "error",

        // Require the use of destructuring
        "prefer-destructuring": ["error", { "object": true, "array": false }],

        // Disallow the use of the `continue` statement
        "no-continue": "error",

        // Enforce explicit `return` in all functions
        "consistent-return": "error",

        // Disallow the use of `debugger`
        "no-debugger": "error",

        // Prevent the use of undeclared variables
        "no-undef": "error",

        // Require spacing inside of curly braces
        "object-curly-spacing": ["error", "always"],

        // Prevent accidental assignments in conditionals (use === or !==)
        "no-cond-assign": ["error", "except-parens"],

        // Disallow assignment operators in conditional expressions
        "no-cond-assign": ["error", "except-parens"]
    }
}
