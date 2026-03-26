import fs from "node:fs/promises";
import path from "node:path";
import { CheckpointError } from "../errors/errors.js";
import type { Checkpoint, CheckpointManifest } from "../types/checkpoint.js";
import type { EventBus } from "../events/event-bus.js";
import type { StorageFacade } from "@renews/storage/index";
import { createId, hashContent, nowIso } from "@renews/shared/index";
import { WorkspaceFs } from "@renews/workspace/index";

export interface CheckpointServiceOptions {
  workspaceRoot: string;
  storageRoot?: string;
}

export class CheckpointService {
  private readonly fsService: WorkspaceFs;
  private readonly storageRoot: string;
  private readonly blobsRoot: string;
  private readonly manifestsRoot: string;

  constructor(
    private readonly storage: StorageFacade,
    private readonly eventBus: EventBus,
    private readonly options: CheckpointServiceOptions,
  ) {
    this.fsService = new WorkspaceFs(options.workspaceRoot);
    this.storageRoot = options.storageRoot ?? path.join(options.workspaceRoot, ".renews", "checkpoints");
    this.blobsRoot = path.join(this.storageRoot, "blobs");
    this.manifestsRoot = path.join(this.storageRoot, "manifests");
  }

  private async ensureDirs(): Promise<void> {
    await fs.mkdir(this.blobsRoot, { recursive: true });
    await fs.mkdir(this.manifestsRoot, { recursive: true });
  }

  private blobPath(hash: string): string {
    return path.join(this.blobsRoot, hash.slice(0, 2), hash.slice(2));
  }

  async create(sessionId: string, label: string, parentId?: string): Promise<Checkpoint> {
    await this.ensureDirs();
    const files = (await this.fsService.list(".")).filter(
      (entry) =>
        !entry.startsWith(".renews/checkpoints/") &&
        !entry.startsWith(".renews/storage/"),
    );
    const manifestFiles: CheckpointManifest["files"] = [];

    for (const relativePath of files) {
      const stat = await this.fsService.stat(relativePath);
      if (!stat.exists || stat.isDirectory) {
        continue;
      }
      const content = await this.fsService.read(relativePath);
      const hash = hashContent(content.content);
      const blobRef = this.blobPath(hash);
      await fs.mkdir(path.dirname(blobRef), { recursive: true });
      try {
        await fs.access(blobRef);
      } catch {
        await fs.writeFile(blobRef, content.content, "utf8");
      }
      manifestFiles.push({
        path: relativePath,
        hash,
        blobRef: path.relative(this.storageRoot, blobRef),
      });
    }

    const manifestWithoutHash = {
      id: createId("checkpoint"),
      sessionId,
      parentId,
      label,
      files: manifestFiles,
      createdAt: nowIso(),
    };
    const manifestHash = hashContent(JSON.stringify(manifestWithoutHash));
    const manifest: CheckpointManifest = {
      ...manifestWithoutHash,
      manifestHash,
    };
    await fs.writeFile(
      path.join(this.manifestsRoot, `${manifest.id}.json`),
      JSON.stringify(manifest, null, 2),
      "utf8",
    );

    const checkpoint: Checkpoint = {
      id: manifest.id,
      sessionId,
      parentId,
      label,
      manifestHash,
      createdAt: manifest.createdAt,
    };
    this.storage.checkpoints.create(checkpoint);
    this.eventBus.publish({
      id: createId("event"),
      sessionId,
      type: "CHECKPOINT_CREATED",
      payload: checkpoint,
      createdAt: nowIso(),
    });
    return checkpoint;
  }

  async restore(sessionId: string, checkpointId: string): Promise<void> {
    const manifestPath = path.join(this.manifestsRoot, `${checkpointId}.json`);
    let manifest: CheckpointManifest;
    try {
      manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as CheckpointManifest;
    } catch (error) {
      throw new CheckpointError(`Checkpoint manifest not found: ${checkpointId}`, false, error);
    }

    if (manifest.sessionId !== sessionId) {
      throw new CheckpointError(`Checkpoint ${checkpointId} does not belong to session ${sessionId}`);
    }

    for (const file of manifest.files) {
      const blobPath = path.join(this.storageRoot, file.blobRef);
      const content = await fs.readFile(blobPath, "utf8");
      await this.fsService.write(file.path, content);
    }

    this.eventBus.publish({
      id: createId("event"),
      sessionId,
      type: "CHECKPOINT_RESTORED",
      payload: {
        checkpointId,
      },
      createdAt: nowIso(),
    });
  }

  list(sessionId: string): Checkpoint[] {
    return this.storage.checkpoints.listBySessionId(sessionId);
  }

  latest(sessionId: string): Checkpoint | undefined {
    return this.storage.checkpoints.getLatest(sessionId);
  }
}
