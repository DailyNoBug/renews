export const createUnifiedDiff = (
  filePath: string,
  before: string,
  after: string,
): string => {
  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  const max = Math.max(beforeLines.length, afterLines.length);
  const lines: string[] = [`--- a/${filePath}`, `+++ b/${filePath}`, "@@ -1 +1 @@"];

  for (let index = 0; index < max; index += 1) {
    const previous = beforeLines[index];
    const next = afterLines[index];
    if (previous === next) {
      if (previous !== undefined) {
        lines.push(` ${previous}`);
      }
      continue;
    }
    if (previous !== undefined) {
      lines.push(`-${previous}`);
    }
    if (next !== undefined) {
      lines.push(`+${next}`);
    }
  }

  return lines.join("\n");
};
