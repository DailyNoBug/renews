import { describe, expect, it } from "vitest";
import { StateMachine } from "@renews/core/index";

describe("StateMachine", () => {
  it("allows planning to executing", () => {
    const machine = new StateMachine();
    expect(machine.canTransition("planning", "executing")).toBe(true);
    expect(machine.transition("planning", "executing")).toBe("executing");
  });

  it("rejects invalid transitions", () => {
    const machine = new StateMachine();
    expect(() => machine.transition("idle", "completed")).toThrowError();
  });
});
