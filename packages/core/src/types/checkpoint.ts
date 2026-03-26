export interface CheckpointFileEntry {
  path: string;
  hash: string;
  blobRef: string;
}

export interface CheckpointManifest {
  id: string;
  sessionId: string;
  parentId?: string;
  label: string;
  manifestHash: string;
  files: CheckpointFileEntry[];
  createdAt: string;
}

export interface Checkpoint {
  id: string;
  sessionId: string;
  parentId?: string;
  label: string;
  manifestHash: string;
  createdAt: string;
}
