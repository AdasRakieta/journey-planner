/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // GitHub Dark Theme Colors
        gh: {
          bg: {
            primary: '#0d1117',    // Main background
            secondary: '#161b22',  // Cards, panels
            tertiary: '#21262d',   // Hover states
            overlay: '#1c2128',    // Modals
            inset: '#010409',      // Inset areas
          },
          border: {
            default: '#30363d',    // Default borders
            muted: '#21262d',      // Subtle borders
          },
          text: {
            primary: '#e6edf3',    // Main text
            secondary: '#7d8590',  // Secondary text
            link: '#58a6ff',       // Links
            success: '#3fb950',    // Success
            danger: '#f85149',     // Danger
            warning: '#d29922',    // Warning
          },
          accent: {
            primary: '#58a6ff',    // Primary accent (blue)
            emphasis: '#1f6feb',   // Emphasized blue
            success: '#238636',    // Success green
            danger: '#da3633',     // Danger red
          },
          button: {
            primary: {
              bg: '#238636',
              hover: '#2ea043',
              border: '#2ea043',
            },
            secondary: {
              bg: '#21262d',
              hover: '#30363d',
              border: '#363b42',
            },
          },
        },
      },
      fontFamily: {
        'github': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Noto Sans', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        'gh': '6px',
        'gh-lg': '12px',
      },
      boxShadow: {
        'gh': '0 0 0 1px #30363d, 0 16px 32px rgba(1, 4, 9, 0.85)',
        'gh-lg': '0 0 0 1px #30363d, 0 24px 48px rgba(1, 4, 9, 0.9)',
      },
    },
  },
  plugins: [],
}
