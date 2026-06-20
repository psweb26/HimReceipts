export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        him: {
          pine: "#1a3b31",
          slate: "#344451",
          stone: "#c8d0cf",
          crimson: "#8f2134",
          marigold: "#d89a23",
        },
      },
      fontFamily: {
        heading: ["Marcellus", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 14px 38px rgba(10, 22, 28, 0.16)",
      },
    },
  },
  plugins: [],
};
