/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./app/**/*.{js,ts,jsx,tsx}",
      "./pages/**/*.{js,ts,jsx,tsx}",
      "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        },
        colors: {
          primary: "#4f46e5",
          background: "#0f172a",
          card: "#1e293b",
          accent: "#38bdf8"
        },
        transitionProperty: {
          'max-height': 'max-height',
        }
      },
    },
    plugins: [],
  };
  