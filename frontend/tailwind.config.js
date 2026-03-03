export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        coastal: {
          midnight: "#07111D",
          ocean: "#0F1D31",
          steel: "#1F3350",
          wave: "#2F5F8F",
          mist: "#F4F2EB",
          neon: "#61BDF8",
        },
        verdant: {
          emerald: "#0F3F35",
          jade: "#166151",
          luxe: "#1C7F6A",
          accent: "#45C6A7",
          olive: "#27453D",
          gold: "#D1B06F",
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
        coastal: '0 20px 46px rgba(1, 8, 18, 0.48)',
        emerald: '0 12px 32px rgba(15, 63, 53, 0.3)',
      },
      backgroundImage: {
        'coastal-veil':
          'radial-gradient(circle at 12% 8%, rgba(97, 189, 248, 0.16), transparent 42%), radial-gradient(circle at 86% 12%, rgba(209, 176, 111, 0.14), transparent 38%), radial-gradient(circle at 42% 110%, rgba(69, 198, 167, 0.1), transparent 42%), linear-gradient(140deg, #07111D 0%, #0F1D31 52%, #1A2E49 100%)',
      },
    },
  },
  plugins: [],
}
