export const DEFAULT_BLOCKED_COMMAND_PATTERNS = [
  "rm -rf /",
  "shutdown",
  "reboot",
  "mkfs",
  "dd if=",
];

export const DEFAULT_PROTECTED_PATHS = [
  ".git",
  ".env",
  "node_modules",
];

export const DEFAULT_SENSITIVE_GLOBS = ["*.pem", "*.key"];
