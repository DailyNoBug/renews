import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@renews/shared": path.resolve(__dirname, "packages/shared/src"),
      "@renews/core": path.resolve(__dirname, "packages/core/src"),
      "@renews/storage": path.resolve(__dirname, "packages/storage/src"),
      "@renews/config": path.resolve(__dirname, "packages/config/src"),
      "@renews/model": path.resolve(__dirname, "packages/model/src"),
      "@renews/sandbox": path.resolve(__dirname, "packages/sandbox/src"),
      "@renews/workspace": path.resolve(__dirname, "packages/workspace/src"),
      "@renews/context": path.resolve(__dirname, "packages/context/src"),
      "@renews/tools": path.resolve(__dirname, "packages/tools/src"),
      "@renews/agents": path.resolve(__dirname, "packages/agents/src"),
      "@renews/memory": path.resolve(__dirname, "packages/memory/src"),
      "@renews/tracing": path.resolve(__dirname, "packages/tracing/src"),
      "@renews/evals": path.resolve(__dirname, "packages/evals/src"),
      sqlite: "node:sqlite",
    },
  },
  ssr: {
    external: ["node:sqlite", "sqlite"],
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    server: {
      deps: {
        external: ["node:sqlite", "sqlite"],
      },
    },
  },
});
