import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import type { SupervisorSystem } from "@renews/core/index";

const readJson = async (req: IncomingMessage): Promise<any> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

const sendJson = (res: ServerResponse, status: number, value: unknown): void => {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(value, null, 2));
};

export const createRouter = (system: SupervisorSystem) => async (
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const method = req.method ?? "GET";
  const segments = url.pathname.split("/").filter(Boolean);

  if (method === "POST" && url.pathname === "/sessions") {
    const body = await readJson(req);
    const goal = String(body.goal ?? "");
    const session = system.runtime.createSession(goal);
    sendJson(res, 201, session);
    return;
  }

  if (segments[0] === "sessions" && segments[1]) {
    const sessionId = segments[1];

    if (method === "GET" && segments.length === 2) {
      sendJson(res, 200, system.supervisor.status(sessionId));
      return;
    }

    if (method === "POST" && segments[2] === "plan") {
      const plan = await system.supervisor.plan(sessionId);
      sendJson(res, 200, plan);
      return;
    }

    if (method === "POST" && segments[2] === "execute") {
      const summary = await system.supervisor.execute(sessionId);
      sendJson(res, 200, summary);
      return;
    }

    if (method === "POST" && segments[2] === "resume") {
      const summary = await system.supervisor.resume(sessionId);
      sendJson(res, 200, summary);
      return;
    }

    if (method === "POST" && segments[2] === "cancel") {
      const session = system.runtime.sessions.get(sessionId);
      if (!session) {
        sendJson(res, 404, { error: "Session not found" });
        return;
      }
      system.runtime.sessions.updateStatus(session, "cancelled");
      sendJson(res, 200, session);
      return;
    }

    if (method === "GET" && segments[2] === "events") {
      const wantsSse = req.headers.accept?.includes("text/event-stream");
      if (wantsSse) {
        res.writeHead(200, {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        });
        const unsubscribe = system.eventBus.subscribe(sessionId, (event) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        });
        req.on("close", unsubscribe);
        return;
      }
      sendJson(res, 200, system.runtime.services.storage.events.listBySessionId(sessionId));
      return;
    }
  }

  if (segments[0] === "approvals" && segments[1]) {
    const approvalId = segments[1];
    if (method === "POST" && segments[2] === "approve") {
      sendJson(res, 200, system.approvals.approve(approvalId));
      return;
    }
    if (method === "POST" && segments[2] === "reject") {
      sendJson(res, 200, system.approvals.reject(approvalId));
      return;
    }
  }

  sendJson(res, 404, { error: "Not found" });
};
