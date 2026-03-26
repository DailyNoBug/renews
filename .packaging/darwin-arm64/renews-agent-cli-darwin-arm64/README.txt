# renews-agent CLI package

Target: darwin-arm64

This package contains the renews-agent CLI runtime for darwin-arm64.

Requirements:
- Node.js 22 or newer installed on the target machine

Usage:
- Extract this archive
- Enter the extracted directory
- Run `./bin/renews plan "your goal"`
- Or add the `bin` directory to your PATH

Notes:
- The Linux package is assembled with Linux-native dependencies.
- The macOS package is assembled with macOS-native dependencies.
- Runtime configuration is still loaded from the current working directory via `renews.config.yaml`.
