/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/renderer/**/*.{html,js}"],
  theme: {
    extend: {},
  },
  plugins: [
    function ({ addUtilities }) {
      const newUtilities = {
        '.app-region-drag': {
          '-webkit-app-region': 'drag'
        },
        '.app-region-no-drag': {
          '-webkit-app-region': 'no-drag'
        },
        '.selectable': {
          '-webkit-user-select': 'text',
          'user-select': 'text',
          'cursor': 'text'
        }
      };

      addUtilities(newUtilities, ['responsive']);
    },
  ],
}

