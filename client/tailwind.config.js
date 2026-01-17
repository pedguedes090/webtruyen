/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#ff6b35',
                    hover: '#f7931e',
                },
                dark: {
                    bg: '#0f0f1a',
                    card: '#1e1e32',
                    secondary: '#1a1a2e',
                    tertiary: '#252540',
                    border: '#2a2a45',
                },
                light: {
                    bg: '#f5f5f5',
                    card: '#ffffff',
                    secondary: '#e8e8e8',
                    tertiary: '#e0e0e0',
                    border: '#d0d0d0',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            screens: {
                'xs': '480px',
            },
        },
    },
    plugins: [],
}
