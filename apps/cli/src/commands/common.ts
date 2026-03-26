import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { ExecutionPlan } from "@renews/core/index";
import type { SupervisorSystem } from "@renews/core/index";

export interface CommandFlags {
  headless: boolean;
  json: boolean;
}

export const parseFlags = (args: string[]): { flags: CommandFlags; rest: string[] } => {
  const flags: CommandFlags = {
    headless: false,
    json: false,
  };
  const rest: string[] = [];
  for (const arg of args) {
    if (arg === "--headless") {
      flags.headless = true;
      continue;
    }
    if (arg === "--json") {
      flags.json = true;
      continue;
    }
    rest.push(arg);
  }
  return { flags, rest };
};

export const printJson = (value: unknown): void => {
  console.log(JSON.stringify(value, null, 2));
};

export const printPlan = (plan: ExecutionPlan): void => {
  console.log(`Plan: ${plan.summary}`);
  if (plan.assumptions.length) {
    console.log("Assumptions:");
    plan.assumptions.forEach((item) => console.log(`- ${item}`));
  }
  if (plan.risks.length) {
    console.log("Risks:");
    plan.risks.forEach((item) => console.log(`- ${item}`));
  }
  console.log("Steps:");
  plan.steps.forEach((step, index) => {
    console.log(`${index + 1}. ${step.title} [${step.status}]`);
    console.log(`   ${step.goal}`);
    if (step.editablePaths?.length) {
      console.log(`   files: ${step.editablePaths.join(", ")}`);
    }
    if (step.validationTargets?.length) {
      console.log(`   validate: ${step.validationTargets.join(", ")}`);
    }
  });
};

export const promptYesNo = async (question: string): Promise<boolean> => {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
};

export const resolveApprovals = async (
  system: SupervisorSystem,
  sessionId: string,
  flags: CommandFlags,
): Promise<boolean> => {
  const pending = system.approvals.pending(sessionId);
  if (pending.length === 0) {
    return true;
  }

  if (flags.headless) {
    if (flags.json) {
      printJson({ approvalsPending: pending });
    }
    return false;
  }

  console.log("Pending approvals:");
  for (const request of pending) {
    console.log(`- ${request.id} ${request.action} [${request.risk}] ${request.reason}`);
    console.log(`  payload: ${JSON.stringify(request.payload)}`);
    const approved = await promptYesNo("Approve this action?");
    if (approved) {
      system.approvals.approve(request.id);
    } else {
      system.approvals.reject(request.id);
      return false;
    }
  }
  return true;
};
