import { bootstrapSupervisorSystem } from "@renews/core/index";
import { printJson, resolveApprovals } from "./common.js";
export const runResumeCommand = async (sessionId, flags) => {
    const system = bootstrapSupervisorSystem({
        workspaceRoot: process.cwd(),
    });
    let summary = await system.supervisor.resume(sessionId);
    while (summary.approvalsPending) {
        const resolved = await resolveApprovals(system, summary.session.id, flags);
        if (!resolved) {
            break;
        }
        summary = await system.supervisor.resume(summary.session.id);
    }
    if (flags.json) {
        printJson(summary);
    }
    else {
        console.log(`Session ${summary.session.id}: ${summary.session.status}`);
    }
};
