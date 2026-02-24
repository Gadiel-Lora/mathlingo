export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        coastal: {
          midnight: "#0B1C2D",
          ocean: "#112B3C",
          steel: "#1B3A4B",
          wave: "#274C77",
          mist: "#EAF4F4",
          neon: "#3DA9FC",
        },
        verdant: {
          emerald: "#0B3D2E",
          jade: "#14532D",
          luxe: "#1F7A4C",
          accent: "#3FA34D",
          olive: "#233B2F",
          gold: "#C6A75E",
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
        coastal: '0 16px 38px rgba(5, 17, 30, 0.45)',
        emerald: '0 10px 30px rgba(11, 61, 46, 0.28)',
      },
      backgroundImage: {
        'coastal-veil':
          'radial-gradient(circle at 14% 8%, rgba(61, 169, 252, 0.14), transparent 38%), radial-gradient(circle at 86% 4%, rgba(198, 167, 94, 0.08), transparent 34%), linear-gradient(145deg, #0B1C2D 0%, #112B3C 56%, #1B3A4B 100%)',
      },
    },
  },
  plugins: [],
}
