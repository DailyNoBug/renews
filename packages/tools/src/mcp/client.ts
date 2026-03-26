import { spawn } from "node:child_process";

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export class McpClient {
  async listTools(command: string, args: string[] = []): Promise<McpToolDefinition[]> {
    const result = await this.run(command, args, JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }));
    return result.tools ?? [];
  }

  async callTool(command: string, args: string[], toolName: string, input: unknown): Promise<unknown> {
    const result = await this.run(
      command,
      args,
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: input,
        },
      }),
    );
    return result;
  }

  private run(command: string, args: string[], payload: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args);
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => {
        stdout += String(chunk);
      });
      child.stderr.on("data", (chunk) => {
        stderr += String(chunk);
      });
      child.on("error", reject);
      child.on("close", () => {
        if (stderr.trim()) {
          reject(new Error(stderr));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch (error) {
          reject(error);
        }
      });
      child.stdin.write(payload);
      child.stdin.end();
    });
  }
}
