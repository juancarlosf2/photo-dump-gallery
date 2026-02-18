import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

export default defineConfig(() => {
  const heroUiSsrDeps = [
    "@heroui/react",
    "@heroui/styles",
    "react-aria-components",
  ];

  return {
    server: {
      port: 3000,
    },
    ssr: {
      noExternal: heroUiSsrDeps,
    },
    plugins: [
      tsConfigPaths(),
      tailwindcss(),
      tanstackStart(),
      nitro({
        preset: "netlify",
        externals: {
          inline: heroUiSsrDeps,
        },
      }),
      viteReact({
        babel: {
          plugins: ["babel-plugin-react-compiler"],
        },
      }),
    ],
  };
});
