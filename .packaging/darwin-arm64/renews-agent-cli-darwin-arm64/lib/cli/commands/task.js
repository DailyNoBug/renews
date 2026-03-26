import { bootstrapSupervisorSystem } from "@renews/core/index";
import { printJson, printPlan, promptYesNo, resolveApprovals } from "./common.js";
export const runTaskCommand = async (goal, flags) => {
    const system = bootstrapSupervisorSystem({
        workspaceRoot: process.cwd(),
    });
    let summary = await system.supervisor.start(goal);
    if (flags.json) {
        printJson(summary);
    }
    else if (summary.plan) {
        printPlan(summary.plan);
    }
    if (summary.approvalsPending) {
        const resolved = await resolveApprovals(system, summary.session.id, flags);
        if (!resolved) {
            const proceed = flags.headless ? false : await promptYesNo("Plan requires approval before execution. Continue?");
            if (!proceed) {
                return;
            }
        }
    }
    else if (!flags.headless) {
        const proceed = await promptYesNo("Plan ready. Execute now?");
        if (!proceed) {
            return;
        }
    }
    summary = await system.supervisor.execute(summary.session.id);
    while (summary.approvalsPending) {
        const resolved = await resolveApprovals(system, summary.session.id, flags);
        if (!resolved) {
            return;
        }
        summary = await system.supervisor.resume(summary.session.id);
    }
    if (flags.json) {
        printJson(summary);
        return;
    }
    console.log(`Session ${summary.session.id} finished with status: ${summary.session.status}`);
    if (summary.changedFiles.length) {
        console.log(`Changed files: ${summary.changedFiles.join(", ")}`);
    }
};
