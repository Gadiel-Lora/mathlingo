export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        coastal: {
          midnight: "#F6FAF9",
          ocean: "#FFFFFF",
          steel: "#C9D8D6",
          wave: "#2D6E75",
          mist: "#182220",
          neon: "#0E7C86",
        },
        verdant: {
          emerald: "#0D3F3C",
          jade: "#126761",
          luxe: "#0E7C86",
          accent: "#2AA876",
          olive: "#334743",
          gold: "#C28B2C",
        },
      },
      keyframes: {
        float: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-6px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(61, 169, 252, 0.0)' },
          '50%': { boxShadow: '0 0 0 10px rgba(61, 169, 252, 0.12)' },
        },
      },
      animation: {
        float: 'float 3s ease-in-out infinite alternate',
        pulseGlow: 'pulseGlow 2.6s ease-in-out infinite',
      },
      boxShadow: {
        coastal: '0 18px 42px rgba(31, 50, 48, 0.12)',
        emerald: '0 12px 32px rgba(14, 124, 134, 0.14)',
      },
      backgroundImage: {
        'coastal-veil':
          'linear-gradient(180deg, #FBFEFD 0%, #EEF6F4 100%)',
      },
    },
  },
  plugins: [],
}
