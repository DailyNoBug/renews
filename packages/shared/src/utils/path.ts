import path from "node:path";

export const normalizeWorkspacePath = (workspaceRoot: string, targetPath: string): string =>
  path.isAbsolute(targetPath) ? path.normalize(targetPath) : path.normalize(path.join(workspaceRoot, targetPath));

export const isSubPath = (root: string, candidate: string): boolean => {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};
