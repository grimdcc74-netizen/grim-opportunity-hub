import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "supabase",
              test: /node_modules[\\/]@supabase[\\/]/,
              priority: 2,
            },
            {
              name: "react",
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 2,
            },
            {
              name: "vendor",
              test: /node_modules[\\/]/,
              priority: 1,
            },
          ],
        },
      },
    },
  },
});
