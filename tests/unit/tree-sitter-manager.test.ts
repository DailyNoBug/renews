import { describe, expect, it } from "vitest";
import { TreeSitterManager } from "@renews/context/index";

describe("TreeSitterManager", () => {
  it("uses AST parsing and supports incremental updates", () => {
    const manager = new TreeSitterManager();
    const filePath = "sample.ts";
    const first = manager.parseFile(
      filePath,
      [
        "import { foo } from './dep';",
        "export class Service {",
        "  greet(name: string) {",
        "    return name;",
        "  }",
        "}",
      ].join("\n"),
    );

    expect(first.imports[0]?.source).toBe("./dep");
    expect(first.symbols.some((symbol) => symbol.name === "Service" && symbol.kind === "class")).toBe(true);
    expect(first.symbols.some((symbol) => symbol.name === "greet" && symbol.kind === "method")).toBe(true);

    const second = manager.updateFile(
      filePath,
      [
        "import { foo, bar as baz } from './dep';",
        "export class Service {",
        "  greet(name: string) {",
        "    return name.toUpperCase();",
        "  }",
        "}",
        "export const value = 1;",
      ].join("\n"),
    );

    expect(second.usedIncrementalParse).toBe(true);
    expect(second.symbols.some((symbol) => symbol.name === "value" && symbol.kind === "const")).toBe(true);
    expect(second.imports[0]?.symbols).toContain("baz");
  });
});
