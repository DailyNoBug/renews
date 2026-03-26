export class RenewsError extends Error {
  code: string;
  retryable: boolean;
  details?: unknown;

  constructor(message: string, code: string, retryable = false, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }
}

export class ApprovalRequiredError extends RenewsError {
  constructor(message: string, details?: unknown) {
    super(message, "APPROVAL_REQUIRED", false, details);
  }
}

export class ToolExecutionError extends RenewsError {
  constructor(message: string, retryable = false, details?: unknown) {
    super(message, "TOOL_EXECUTION_ERROR", retryable, details);
  }
}

export class ModelInvocationError extends RenewsError {
  constructor(message: string, retryable = true, details?: unknown) {
    super(message, "MODEL_INVOCATION_ERROR", retryable, details);
  }
}

export class PatchApplyError extends RenewsError {
  constructor(message: string, details?: unknown) {
    super(message, "PATCH_APPLY_ERROR", false, details);
  }
}

export class ValidationError extends RenewsError {
  constructor(message: string, retryable = true, details?: unknown) {
    super(message, "VALIDATION_ERROR", retryable, details);
  }
}

export class CheckpointError extends RenewsError {
  constructor(message: string, retryable = false, details?: unknown) {
    super(message, "CHECKPOINT_ERROR", retryable, details);
  }
}
