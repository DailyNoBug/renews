import fs from "node:fs";

export class WorkspaceWatcher {
  watch(root: string, onChange: (filePath: string) => void): fs.FSWatcher {
    return fs.watch(root, { recursive: true }, (_, fileName) => {
      if (fileName) {
        onChange(fileName);
      }
    });
  }
}
