import * as vscode from "vscode";

const serviceBaseUrl = (): string =>
  vscode.workspace.getConfiguration("renews").get<string>("serviceBaseUrl", "http://127.0.0.1:8787");

const requestJson = async (url: string, init?: RequestInit): Promise<any> => {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
};

export const activate = (context: vscode.ExtensionContext): void => {
  const output = vscode.window.createOutputChannel("Renews Agent");
  context.subscriptions.push(output);

  context.subscriptions.push(
    vscode.commands.registerCommand("renews.startTask", async () => {
      const goal = await vscode.window.showInputBox({
        prompt: "Task goal",
      });
      if (!goal) {
        return;
      }
      const session = await requestJson(`${serviceBaseUrl()}/sessions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goal }),
      });
      const plan = await requestJson(`${serviceBaseUrl()}/sessions/${session.id}/plan`, {
        method: "POST",
      });
      output.appendLine(`Session ${session.id}`);
      output.appendLine(JSON.stringify(plan, null, 2));
      output.show(true);
      vscode.window.showInformationMessage(`Renews session created: ${session.id}`);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("renews.showStatus", async () => {
      const sessionId = await vscode.window.showInputBox({
        prompt: "Session id",
      });
      if (!sessionId) {
        return;
      }
      const status = await requestJson(`${serviceBaseUrl()}/sessions/${sessionId}`);
      output.appendLine(JSON.stringify(status, null, 2));
      output.show(true);
    }),
  );
};

export const deactivate = (): void => {};
