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
  const tssServerFnBase = process.env.TSS_SERVER_FN_BASE ?? "/_serverFn/";
  const tssRouterBasepath = process.env.TSS_ROUTER_BASEPATH ?? "/";

  return {
    server: {
      port: 3000,
    },
    define: {
      // Netlify's Node-based dev server does not provide Bun's `process` browser shim.
      // Ensure TanStack Start client RPC/hydration code gets compile-time values.
      "process.env.TSS_SERVER_FN_BASE": JSON.stringify(tssServerFnBase),
      "process.env.TSS_ROUTER_BASEPATH": JSON.stringify(tssRouterBasepath),
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
