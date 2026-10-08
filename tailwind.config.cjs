/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                ivory: '#F3EEE6',
                paper: '#FBF8F3',
                ink: '#1A120C',
                espresso: '#12100E',
                line: '#E4D8C8',
                brass: {
                    DEFAULT: '#9A7844',
                    bright: '#C6A36A',
                    muted: '#F3E6D0',
                },
                accent: {
                    DEFAULT: '#9A7844',
                    hover: '#7C6236',
                    muted: '#F3E6D0',
                },
            },
            fontFamily: {
                sans: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
            },
            boxShadow: {
                maison: '0 24px 60px -32px rgba(26, 18, 12, 0.45)',
            },
        },
    },
    plugins: [require('@tailwindcss/forms')({ strategy: 'class' })],
};
