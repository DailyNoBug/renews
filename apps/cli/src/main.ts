import path from "node:path";
import { bootstrapSupervisorSystem } from "@renews/core/index";
import { RepoMapBuilder, TreeSitterManager } from "@renews/context/index";
import { loadConfig } from "@renews/config/index";
import { parseFlags, printJson, printPlan } from "./commands/common.js";
import { runTaskCommand } from "./commands/task.js";
import { runResumeCommand } from "./commands/resume.js";

const usage = (): void => {
  console.log(`Usage:
  renews task "<goal>" [--headless] [--json]
  renews plan "<goal>" [--json]
  renews resume <sessionId> [--headless] [--json]
  renews approvals
  renews status <sessionId>
  renews logs <sessionId>
  renews checkpoint list <sessionId>
  renews checkpoint restore <sessionId> <checkpointId>
  renews config validate
  renews index rebuild`);
};

const main = async (): Promise<void> => {
  const { flags, rest } = parseFlags(process.argv.slice(2));
  const [command, ...args] = rest;

  if (!command) {
    usage();
    return;
  }

  switch (command) {
    case "task": {
      const goal = args.join(" ").trim();
      if (!goal) {
        throw new Error("Missing task goal");
      }
      await runTaskCommand(goal, flags);
      return;
    }
    case "plan": {
      const goal = args.join(" ").trim();
      if (!goal) {
        throw new Error("Missing plan goal");
      }
      const system = bootstrapSupervisorSystem({
        workspaceRoot: process.cwd(),
      });
      const session = system.runtime.createSession(goal);
      const plan = await system.supervisor.plan(session.id);
      if (flags.json) {
        printJson(plan);
      } else {
        printPlan(plan);
      }
      return;
    }
    case "resume": {
      const sessionId = args[0];
      if (!sessionId) {
        throw new Error("Missing sessionId");
      }
      await runResumeCommand(sessionId, flags);
      return;
    }
    case "approvals": {
      const system = bootstrapSupervisorSystem({
        workspaceRoot: process.cwd(),
      });
      const pending = system.approvals.pending();
      flags.json ? printJson(pending) : pending.forEach((entry) => console.log(`${entry.id} ${entry.action} ${entry.reason}`));
      return;
    }
    case "status": {
      const sessionId = args[0];
      if (!sessionId) {
        throw new Error("Missing sessionId");
      }
      const system = bootstrapSupervisorSystem({
        workspaceRoot: process.cwd(),
      });
      const status = system.supervisor.status(sessionId);
      flags.json ? printJson(status) : console.log(JSON.stringify(status, null, 2));
      return;
    }
    case "logs": {
      const sessionId = args[0];
      if (!sessionId) {
        throw new Error("Missing sessionId");
      }
      const system = bootstrapSupervisorSystem({
        workspaceRoot: process.cwd(),
      });
      const events = system.runtime.services.storage.events.listBySessionId(sessionId);
      flags.json ? printJson(events) : events.forEach((event) => console.log(`${event.createdAt} ${event.type}`));
      return;
    }
    case "checkpoint": {
      const [subcommand, sessionId, checkpointId] = args;
      if (!subcommand || !sessionId) {
        throw new Error("Usage: renews checkpoint <list|restore> <sessionId> [checkpointId]");
      }
      const system = bootstrapSupervisorSystem({
        workspaceRoot: process.cwd(),
      });
      if (subcommand === "list") {
        const checkpoints = system.checkpoints.list(sessionId);
        flags.json
          ? printJson(checkpoints)
          : checkpoints.forEach((entry) => console.log(`${entry.id} ${entry.label} ${entry.createdAt}`));
        return;
      }
      if (subcommand === "restore") {
        if (!checkpointId) {
          throw new Error("Missing checkpointId");
        }
        await system.checkpoints.restore(sessionId, checkpointId);
        console.log(`Restored checkpoint ${checkpointId}`);
        return;
      }
      throw new Error(`Unknown checkpoint subcommand: ${subcommand}`);
    }
    case "config": {
      const subcommand = args[0];
      if (subcommand !== "validate") {
        throw new Error("Usage: renews config validate");
      }
      const result = loadConfig({
        cwd: process.cwd(),
      });
      flags.json ? printJson(result) : console.log("Config is valid");
      if (result.warnings.length && !flags.json) {
        result.warnings.forEach((warning) => console.warn(`Warning: ${warning}`));
      }
      return;
    }
    case "index": {
      const subcommand = args[0];
      if (subcommand !== "rebuild") {
        throw new Error("Usage: renews index rebuild");
      }
      const system = bootstrapSupervisorSystem({
        workspaceRoot: process.cwd(),
      });
      const repoMap = await new RepoMapBuilder(new TreeSitterManager()).build(
        path.resolve(system.config.project.workspaceRoot),
        system.config.context.repoMap.maxSymbols,
      );
      flags.json ? printJson(repoMap) : console.log(`Indexed ${repoMap.files.length} files`);
      return;
    }
    default:
      usage();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
