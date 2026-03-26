import { EventEmitter } from "node:events";
import type { SessionEvent } from "../types/event.js";

export class EventBus {
  private readonly emitter = new EventEmitter();

  publish(event: SessionEvent): void {
    this.emitter.emit(event.sessionId, event);
    this.emitter.emit("*", event);
  }

  subscribe(sessionId: string, handler: (event: SessionEvent) => void): () => void {
    this.emitter.on(sessionId, handler);
    return () => this.emitter.off(sessionId, handler);
  }

  subscribeAll(handler: (event: SessionEvent) => void): () => void {
    this.emitter.on("*", handler);
    return () => this.emitter.off("*", handler);
  }
}
