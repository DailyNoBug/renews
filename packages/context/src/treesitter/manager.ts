import path from "node:path";
import Parser from "tree-sitter";
import javascriptLanguage from "tree-sitter-javascript";
import pythonLanguage from "tree-sitter-python";
import typescriptLanguages from "tree-sitter-typescript";

export interface ParsedImport {
  source: string;
  symbols: string[];
}

export interface ParsedSymbol {
  name: string;
  kind: "class" | "function" | "method" | "interface" | "type" | "const" | "module";
  signature?: string;
  exported: boolean;
  startLine: number;
  endLine: number;
}

export interface ParsedFileSummary {
  language: string;
  imports: ParsedImport[];
  symbols: ParsedSymbol[];
  summary: string;
  hasSyntaxError?: boolean;
  usedIncrementalParse?: boolean;
  rootType?: string;
}

interface TreeCacheEntry {
  languageKey: SupportedLanguage;
  content: string;
  tree?: Parser.Tree;
  summary: ParsedFileSummary;
}

type SupportedLanguage =
  | "typescript"
  | "tsx"
  | "javascript"
  | "jsx"
  | "python"
  | "json"
  | "markdown"
  | "text";

const inferLanguage = (filePath: string): SupportedLanguage => {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case ".ts":
      return "typescript";
    case ".tsx":
      return "tsx";
    case ".js":
      return "javascript";
    case ".jsx":
      return "jsx";
    case ".py":
      return "python";
    case ".json":
      return "json";
    case ".md":
      return "markdown";
    default:
      return "text";
  }
};

const stripQuotes = (value: string): string => value.replace(/^['"`]|['"`]$/g, "");

const signatureForNode = (node: Parser.SyntaxNode): string =>
  node.text.split(/\r?\n/).join(" ").slice(0, 160);

const toLine = (point: Parser.Point): number => point.row + 1;

const computePointAt = (content: string, index: number): Parser.Point => {
  const prefix = content.slice(0, index);
  const lines = prefix.split(/\r?\n/);
  return {
    row: Math.max(0, lines.length - 1),
    column: lines[lines.length - 1]?.length ?? 0,
  };
};

const byteLength = (value: string): number => Buffer.byteLength(value, "utf8");

const computeIncrementalEdit = (previous: string, next: string): Parser.Edit | null => {
  if (previous === next) {
    return null;
  }

  let prefix = 0;
  while (
    prefix < previous.length &&
    prefix < next.length &&
    previous[prefix] === next[prefix]
  ) {
    prefix += 1;
  }

  let previousSuffix = previous.length;
  let nextSuffix = next.length;
  while (
    previousSuffix > prefix &&
    nextSuffix > prefix &&
    previous[previousSuffix - 1] === next[nextSuffix - 1]
  ) {
    previousSuffix -= 1;
    nextSuffix -= 1;
  }

  return {
    startIndex: byteLength(previous.slice(0, prefix)),
    oldEndIndex: byteLength(previous.slice(0, previousSuffix)),
    newEndIndex: byteLength(next.slice(0, nextSuffix)),
    startPosition: computePointAt(previous, prefix),
    oldEndPosition: computePointAt(previous, previousSuffix),
    newEndPosition: computePointAt(next, nextSuffix),
  };
};

const languageRegistry: Record<
  Extract<SupportedLanguage, "typescript" | "tsx" | "javascript" | "jsx" | "python">,
  Parser.Language
> = {
  typescript: typescriptLanguages.typescript as Parser.Language,
  tsx: typescriptLanguages.tsx as Parser.Language,
  javascript: javascriptLanguage as Parser.Language,
  jsx: javascriptLanguage as Parser.Language,
  python: pythonLanguage as Parser.Language,
};

const unwrapExport = (
  node: Parser.SyntaxNode,
): { exported: boolean; target: Parser.SyntaxNode } =>
  node.type === "export_statement" && node.firstNamedChild
    ? { exported: true, target: node.firstNamedChild }
    : { exported: false, target: node };

const extractMethodSymbols = (
  classNode: Parser.SyntaxNode,
  exported: boolean,
): ParsedSymbol[] => {
  const body = classNode.childForFieldName("body") ?? classNode.namedChildren.find((child) => child.type === "class_body");
  if (!body) {
    return [];
  }

  return body.namedChildren
    .filter((child) =>
      ["method_definition", "public_field_definition", "method_signature", "abstract_method_signature"].includes(
        child.type,
      ),
    )
    .map((child) => {
      const nameNode = child.childForFieldName("name") ?? child.firstNamedChild;
      return {
        name: nameNode?.text ?? child.text,
        kind: "method" as const,
        signature: signatureForNode(child),
        exported,
        startLine: toLine(child.startPosition),
        endLine: toLine(child.endPosition),
      };
    });
};

const extractTsJsImports = (rootNode: Parser.SyntaxNode): ParsedImport[] => {
  const imports: ParsedImport[] = [];
  for (const node of rootNode.namedChildren.filter((child) => child.type === "import_statement")) {
    const clause = node.namedChildren.find((child) => child.type === "import_clause");
    const sourceNode = node.namedChildren.find((child) => child.type === "string");
    const symbols: string[] = [];
    if (clause) {
      for (const child of clause.namedChildren) {
        if (child.type === "identifier") {
          symbols.push(child.text);
          continue;
        }
        if (child.type === "named_imports") {
          for (const nested of child.namedChildren) {
            if (nested.type === "import_specifier") {
              symbols.push(
                nested.childForFieldName("alias")?.text ??
                  nested.childForFieldName("name")?.text ??
                  nested.text,
              );
            }
          }
        }
        if (child.type === "namespace_import") {
          symbols.push(child.childForFieldName("name")?.text ?? child.text);
        }
      }
    }
    imports.push({
      source: sourceNode ? stripQuotes(sourceNode.text) : "unknown",
      symbols,
    });
  }
  return imports;
};

const extractPythonImports = (rootNode: Parser.SyntaxNode): ParsedImport[] => {
  const imports: ParsedImport[] = [];
  for (const node of rootNode.namedChildren) {
    if (node.type === "import_statement") {
      imports.push({
        source: "module",
        symbols: node.namedChildren.map((child) => child.text),
      });
      continue;
    }
    if (node.type === "import_from_statement") {
      const source = node.namedChildren[0]?.text ?? "module";
      const symbols = node.namedChildren.slice(1).map((child) => child.text);
      imports.push({
        source,
        symbols,
      });
    }
  }
  return imports;
};

const extractTsJsSymbols = (rootNode: Parser.SyntaxNode): ParsedSymbol[] => {
  const symbols: ParsedSymbol[] = [];

  for (const node of rootNode.namedChildren) {
    const { exported, target } = unwrapExport(node);
    if (
      ![
        "class_declaration",
        "function_declaration",
        "interface_declaration",
        "type_alias_declaration",
        "lexical_declaration",
      ].includes(target.type)
    ) {
      continue;
    }

    if (target.type === "class_declaration") {
      const nameNode = target.childForFieldName("name") ?? target.firstNamedChild;
      if (nameNode) {
        symbols.push({
          name: nameNode.text,
          kind: "class",
          signature: signatureForNode(target),
          exported,
          startLine: toLine(target.startPosition),
          endLine: toLine(target.endPosition),
        });
      }
      symbols.push(...extractMethodSymbols(target, exported));
      continue;
    }

    if (target.type === "function_declaration") {
      const nameNode = target.childForFieldName("name") ?? target.firstNamedChild;
      if (nameNode) {
        symbols.push({
          name: nameNode.text,
          kind: "function",
          signature: signatureForNode(target),
          exported,
          startLine: toLine(target.startPosition),
          endLine: toLine(target.endPosition),
        });
      }
      continue;
    }

    if (target.type === "interface_declaration" || target.type === "type_alias_declaration") {
      const nameNode = target.childForFieldName("name") ?? target.firstNamedChild;
      if (nameNode) {
        symbols.push({
          name: nameNode.text,
          kind: target.type === "interface_declaration" ? "interface" : "type",
          signature: signatureForNode(target),
          exported,
          startLine: toLine(target.startPosition),
          endLine: toLine(target.endPosition),
        });
      }
      continue;
    }

    if (target.type === "lexical_declaration") {
      for (const declarator of target.namedChildren.filter((child) => child.type === "variable_declarator")) {
        const nameNode = declarator.childForFieldName("name") ?? declarator.firstNamedChild;
        if (!nameNode) {
          continue;
        }
        symbols.push({
          name: nameNode.text,
          kind: "const",
          signature: signatureForNode(declarator),
          exported,
          startLine: toLine(declarator.startPosition),
          endLine: toLine(declarator.endPosition),
        });
      }
    }
  }

  return symbols;
};

const extractPythonSymbols = (rootNode: Parser.SyntaxNode): ParsedSymbol[] => {
  const symbols: ParsedSymbol[] = [];

  for (const node of rootNode.namedChildren) {
    if (node.type === "class_definition") {
      const nameNode = node.childForFieldName("name") ?? node.namedChildren[0];
      if (nameNode) {
        symbols.push({
          name: nameNode.text,
          kind: "class",
          signature: signatureForNode(node),
          exported: false,
          startLine: toLine(node.startPosition),
          endLine: toLine(node.endPosition),
        });
      }
      const body = node.childForFieldName("body") ?? node.namedChildren.find((child) => child.type === "block");
      for (const nested of body?.namedChildren ?? []) {
        if (nested.type !== "function_definition") {
          continue;
        }
        const methodName = nested.childForFieldName("name") ?? nested.namedChildren[0];
        if (!methodName) {
          continue;
        }
        symbols.push({
          name: methodName.text,
          kind: "method",
          signature: signatureForNode(nested),
          exported: false,
          startLine: toLine(nested.startPosition),
          endLine: toLine(nested.endPosition),
        });
      }
      continue;
    }

    if (node.type === "function_definition") {
      const nameNode = node.childForFieldName("name") ?? node.namedChildren[0];
      if (nameNode) {
        symbols.push({
          name: nameNode.text,
          kind: "function",
          signature: signatureForNode(node),
          exported: false,
          startLine: toLine(node.startPosition),
          endLine: toLine(node.endPosition),
        });
      }
    }
  }

  return symbols;
};

const extractFallbackImports = (language: SupportedLanguage, content: string): ParsedImport[] => {
  if (language === "python") {
    const regex = /from\s+([A-Za-z0-9_\.]+)\s+import\s+(.+)/g;
    return [...content.matchAll(regex)].map((match) => ({
      source: match[1],
      symbols: match[2]
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    }));
  }

  if (language === "typescript" || language === "tsx" || language === "javascript" || language === "jsx") {
    const regex = /import\s+(.*?)\s+from\s+["'](.+?)["']/g;
    return [...content.matchAll(regex)].map((match) => ({
      source: match[2],
      symbols: match[1]
        .replace(/[{}]/g, "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    }));
  }

  return [];
};

const extractFallbackSymbols = (language: SupportedLanguage, content: string): ParsedSymbol[] => {
  const symbols: ParsedSymbol[] = [];
  const lines = content.split(/\r?\n/);
  const addSymbol = (
    kind: ParsedSymbol["kind"],
    name: string,
    signature: string | undefined,
    line: number,
    exported: boolean,
  ): void => {
    symbols.push({
      name,
      kind,
      signature,
      exported,
      startLine: line,
      endLine: line,
    });
  };

  lines.forEach((line, index) => {
    if (language === "typescript" || language === "tsx" || language === "javascript" || language === "jsx") {
      const classMatch = line.match(/^(export\s+)?class\s+([A-Za-z0-9_]+)/);
      if (classMatch) {
        addSymbol("class", classMatch[2], line.trim(), index + 1, Boolean(classMatch[1]));
      }
      const fnMatch = line.match(/^(export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/);
      if (fnMatch) {
        addSymbol("function", fnMatch[2], line.trim(), index + 1, Boolean(fnMatch[1]));
      }
      const constMatch = line.match(/^(export\s+)?const\s+([A-Za-z0-9_]+)/);
      if (constMatch) {
        addSymbol("const", constMatch[2], line.trim(), index + 1, Boolean(constMatch[1]));
      }
      const interfaceMatch = line.match(/^(export\s+)?interface\s+([A-Za-z0-9_]+)/);
      if (interfaceMatch) {
        addSymbol("interface", interfaceMatch[2], line.trim(), index + 1, Boolean(interfaceMatch[1]));
      }
      const typeMatch = line.match(/^(export\s+)?type\s+([A-Za-z0-9_]+)/);
      if (typeMatch) {
        addSymbol("type", typeMatch[2], line.trim(), index + 1, Boolean(typeMatch[1]));
      }
    } else if (language === "python") {
      const classMatch = line.match(/^class\s+([A-Za-z0-9_]+)/);
      if (classMatch) {
        addSymbol("class", classMatch[1], line.trim(), index + 1, false);
      }
      const fnMatch = line.match(/^def\s+([A-Za-z0-9_]+)/);
      if (fnMatch) {
        addSymbol("function", fnMatch[1], line.trim(), index + 1, false);
      }
    }
  });

  return symbols;
};

const summarizeFile = (
  filePath: string,
  language: string,
  symbols: ParsedSymbol[],
  imports: ParsedImport[],
  hasSyntaxError: boolean,
): string => {
  const symbolSummary =
    symbols.length > 0
      ? symbols
          .slice(0, 6)
          .map((symbol) => `${symbol.kind} ${symbol.name}`)
          .join(", ")
      : "no extracted symbols";
  return `${filePath} [${language}] has ${symbols.length} symbols (${symbolSummary}) and ${imports.length} imports${hasSyntaxError ? "; syntax errors detected" : ""}.`;
};

export class TreeSitterManager {
  private readonly parserPool = new Map<SupportedLanguage, Parser>();
  private readonly cache = new Map<string, TreeCacheEntry>();

  private getParser(languageKey: SupportedLanguage): Parser | undefined {
    const grammar =
      languageKey === "typescript" ||
      languageKey === "tsx" ||
      languageKey === "javascript" ||
      languageKey === "jsx" ||
      languageKey === "python"
        ? languageRegistry[languageKey]
        : undefined;

    if (!grammar) {
      return undefined;
    }

    let parser = this.parserPool.get(languageKey);
    if (!parser) {
      parser = new Parser();
      parser.setLanguage(grammar);
      this.parserPool.set(languageKey, parser);
    }
    return parser;
  }

  private buildSummary(
    filePath: string,
    languageKey: SupportedLanguage,
    content: string,
    tree: Parser.Tree | undefined,
    usedIncrementalParse: boolean,
  ): ParsedFileSummary {
    const rootNode = tree?.rootNode;
    const hasSyntaxError = rootNode?.hasError ?? false;
    const imports =
      rootNode && (languageKey === "typescript" || languageKey === "tsx" || languageKey === "javascript" || languageKey === "jsx")
        ? extractTsJsImports(rootNode)
        : rootNode && languageKey === "python"
          ? extractPythonImports(rootNode)
          : extractFallbackImports(languageKey, content);
    const symbols =
      rootNode && (languageKey === "typescript" || languageKey === "tsx" || languageKey === "javascript" || languageKey === "jsx")
        ? extractTsJsSymbols(rootNode)
        : rootNode && languageKey === "python"
          ? extractPythonSymbols(rootNode)
          : extractFallbackSymbols(languageKey, content);

    return {
      language: languageKey,
      imports,
      symbols,
      summary: summarizeFile(filePath, languageKey, symbols, imports, hasSyntaxError),
      hasSyntaxError,
      usedIncrementalParse,
      rootType: rootNode?.type,
    };
  }

  private parseInternal(
    filePath: string,
    content: string,
    useIncremental: boolean,
  ): ParsedFileSummary {
    const languageKey = inferLanguage(filePath);
    const parser = this.getParser(languageKey);
    const cached = this.cache.get(filePath);
    const canReuseTree =
      useIncremental &&
      parser &&
      cached &&
      cached.languageKey === languageKey &&
      cached.tree &&
      cached.content !== content;

    let tree: Parser.Tree | undefined;
    let usedIncrementalParse = false;

    if (canReuseTree) {
      const previousTree = cached.tree!;
      const edit = computeIncrementalEdit(cached.content, content);
      if (edit) {
        previousTree.edit(edit);
        tree = parser.parse(content, previousTree);
        usedIncrementalParse = true;
      }
    }

    if (!tree && parser) {
      tree = parser.parse(content);
    }

    const summary = this.buildSummary(filePath, languageKey, content, tree, usedIncrementalParse);
    this.cache.set(filePath, {
      languageKey,
      content,
      tree,
      summary,
    });
    return summary;
  }

  parseFile(filePath: string, content: string): ParsedFileSummary {
    const cached = this.cache.get(filePath);
    if (cached && cached.content === content) {
      return {
        ...cached.summary,
        usedIncrementalParse: false,
      };
    }
    return this.parseInternal(filePath, content, false);
  }

  updateFile(filePath: string, content: string): ParsedFileSummary {
    const cached = this.cache.get(filePath);
    if (!cached) {
      return this.parseFile(filePath, content);
    }
    if (cached.content === content) {
      return {
        ...cached.summary,
        usedIncrementalParse: false,
      };
    }
    return this.parseInternal(filePath, content, true);
  }

  getCached(filePath: string): ParsedFileSummary | undefined {
    return this.cache.get(filePath)?.summary;
  }

  invalidate(filePath: string): void {
    this.cache.delete(filePath);
  }
}
