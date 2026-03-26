import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const [command, stageDir, target] = process.argv.slice(2);

if (!command || !stageDir || !target) {
  console.error("Usage: node scripts/prepare-cli-package.mjs <init|populate> <stageDir> <target>");
  process.exit(1);
}

const runtimeDependencies = [
  "better-sqlite3",
  "pino",
  "tree-sitter",
  "tree-sitter-javascript",
  "tree-sitter-python",
  "tree-sitter-typescript",
  "yaml",
  "zod",
  "zod-to-json-schema",
];

const internalPackages = [
  "agents",
  "config",
  "context",
  "core",
  "evals",
  "memory",
  "model",
  "sandbox",
  "shared",
  "storage",
  "tools",
  "tracing",
  "workspace",
];

const stageRoot = path.resolve(stageDir);

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, "utf8"));

const copyDir = async (source, destination) => {
  await fs.mkdir(destination, { recursive: true });
  await fs.cp(source, destination, { recursive: true });
};

const ensureCleanDir = async (directory) => {
  await fs.rm(directory, { recursive: true, force: true });
  await fs.mkdir(directory, { recursive: true });
};

const writeText = (filePath, content, mode) =>
  fs.writeFile(filePath, content, {
    encoding: "utf8",
    mode,
  });

const resolvedDependencyVersions = async () => {
  const entries = await Promise.all(
    runtimeDependencies.map(async (name) => {
      const packageJsonPath = path.join(rootDir, "node_modules", name, "package.json");
      const pkg = await readJson(packageJsonPath);
      return [name, pkg.version];
    }),
  );
  return Object.fromEntries(entries);
};

const packageReadme = (resolvedTarget) => `# renews-agent CLI package

Target: ${resolvedTarget}

This package contains the renews-agent CLI runtime for ${resolvedTarget}.

Requirements:
- Node.js 22 or newer installed on the target machine

Usage:
- Extract this archive
- Enter the extracted directory
- Run \`./bin/renews plan "your goal"\`
- Or add the \`bin\` directory to your PATH

Notes:
- The Linux package is assembled with Linux-native dependencies.
- The macOS package is assembled with macOS-native dependencies.
- Runtime configuration is still loaded from the current working directory via \`renews.config.yaml\`.
`;

const rootPackageJson = await readJson(path.join(rootDir, "package.json"));

if (command === "init") {
  await ensureCleanDir(stageRoot);
  await fs.mkdir(path.join(stageRoot, "bin"), { recursive: true });
  await fs.mkdir(path.join(stageRoot, "lib"), { recursive: true });

  const dependencies = await resolvedDependencyVersions();

  const stagePackageJson = {
    name: `renews-agent-cli-${target}`,
    version: rootPackageJson.version,
    private: true,
    type: "module",
    bin: {
      renews: "./bin/renews",
    },
    engines: {
      node: rootPackageJson.engines.node,
    },
    dependencies,
  };

  await writeText(
    path.join(stageRoot, "package.json"),
    `${JSON.stringify(stagePackageJson, null, 2)}\n`,
  );
  await writeText(
    path.join(stageRoot, ".npmrc"),
    "fund=false\naudit=false\nupdate-notifier=false\n",
  );
  await writeText(
    path.join(stageRoot, "README.txt"),
    packageReadme(target),
  );
  await writeText(
    path.join(stageRoot, "bin", "renews"),
    `#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/../lib/cli/main.js" "$@"
`,
    0o755,
  );
  process.exit(0);
}

if (command === "populate") {
  await copyDir(path.join(rootDir, "dist", "apps", "cli", "src"), path.join(stageRoot, "lib", "cli"));
  await fs.mkdir(path.join(stageRoot, "share"), { recursive: true });
  await copyDir(
    path.join(rootDir, "docs"),
    path.join(stageRoot, "share", "docs"),
  );
  await fs.copyFile(
    path.join(rootDir, "renews.config.yaml"),
    path.join(stageRoot, "share", "renews.config.yaml"),
  );

  for (const packageName of internalPackages) {
    const source = path.join(rootDir, "dist", "packages", packageName, "src");
    const destination = path.join(stageRoot, "node_modules", "@renews", packageName);
    await copyDir(source, destination);

    if (packageName === "storage") {
      await copyDir(
        path.join(rootDir, "packages", "storage", "src", "migrations"),
        path.join(destination, "migrations"),
      );
    }

    const packageJson = {
      name: `@renews/${packageName}`,
      private: true,
      type: "module",
      main: "./index.js",
      exports: {
        ".": "./index.js",
        "./index": "./index.js",
      },
    };

    await writeText(
      path.join(destination, "package.json"),
      `${JSON.stringify(packageJson, null, 2)}\n`,
    );
  }

  process.exit(0);
}

console.error(`Unknown command: ${command}`);
process.exit(1);
