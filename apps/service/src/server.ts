import http from "node:http";
import { bootstrapSupervisorSystem } from "@renews/core/index";
import { createRouter } from "./routes/router.js";

const system = bootstrapSupervisorSystem({
  workspaceRoot: process.cwd(),
});

const server = http.createServer((req, res) => {
  createRouter(system)(req, res).catch((error) => {
    res.writeHead(500, {
      "content-type": "application/json; charset=utf-8",
    });
    res.end(
      JSON.stringify(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
  });
});

server.listen(system.config.service.port, system.config.service.host, () => {
  console.log(
    `renews service listening on http://${system.config.service.host}:${system.config.service.port}`,
  );
});
