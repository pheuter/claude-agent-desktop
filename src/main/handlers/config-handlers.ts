import { existsSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import { release, type, version } from 'os';
import { app, ipcMain } from 'electron';

import {
  buildClaudeSessionEnv,
  buildEnhancedPath,
  ensureWorkspaceDir,
  getAnthropicBaseUrlStatus,
  getApiKeyStatus,
  getDebugMode,
  getWorkspaceDir,
  loadConfig,
  saveConfig,
  setAnthropicBaseUrl,
  setApiKey
} from '../lib/config';

const requireModule = createRequire(import.meta.url);

function getClaudeAgentSdkVersion(): string {
  try {
    // Try to resolve the SDK package.json
    const sdkPackagePath = requireModule.resolve('@anthropic-ai/claude-agent-sdk/package.json');

    // Handle app.asar unpacked case (production builds)
    let packagePath = sdkPackagePath;
    if (sdkPackagePath.includes('app.asar')) {
      const unpackedPath = sdkPackagePath.replace('app.asar', 'app.asar.unpacked');
      if (existsSync(unpackedPath)) {
        packagePath = unpackedPath;
      }
    }

    if (existsSync(packagePath)) {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
      return packageJson.version || 'unknown';
    }
  } catch {
    // Fallback if we can't read the version
  }
  return 'unknown';
}

export function registerConfigHandlers(): void {
  // Get workspace directory
  ipcMain.handle('config:get-workspace-dir', () => {
    return { workspaceDir: getWorkspaceDir() };
  });

  // Set workspace directory
  ipcMain.handle('config:set-workspace-dir', async (_event, workspaceDir: string) => {
    const trimmedPath = workspaceDir.trim();
    if (!trimmedPath) {
      return { success: false, error: 'Workspace directory cannot be empty' };
    }

    const config = loadConfig();
    config.workspaceDir = trimmedPath;
    saveConfig(config);

    // Create the new workspace directory
    await ensureWorkspaceDir();

    return { success: true };
  });

  // Get debug mode
  ipcMain.handle('config:get-debug-mode', () => {
    return { debugMode: getDebugMode() };
  });

  // Set debug mode
  ipcMain.handle('config:set-debug-mode', (_event, debugMode: boolean) => {
    const config = loadConfig();
    config.debugMode = debugMode;
    saveConfig(config);
    return { success: true };
  });

  // API key status (env vs local config)
  ipcMain.handle('config:get-api-key-status', () => {
    return { status: getApiKeyStatus() };
  });

  // Set or clear API key stored in app config
  ipcMain.handle('config:set-api-key', (_event, apiKey?: string | null) => {
    const normalized = apiKey?.trim() || null;
    setApiKey(normalized);
    return { success: true, status: getApiKeyStatus() };
  });

  // Base URL status (env vs local config)
  ipcMain.handle('config:get-base-url-status', () => {
    return { status: getAnthropicBaseUrlStatus() };
  });

  // Set or clear base URL stored in app config
  ipcMain.handle('config:set-base-url', (_event, baseUrl?: string | null) => {
    const normalized = baseUrl?.trim() || null;
    setAnthropicBaseUrl(normalized);
    return { success: true, status: getAnthropicBaseUrlStatus() };
  });

  // Get PATH environment variable info (for debug/dev section)
  // Uses the enhanced PATH (same as Claude Agent SDK) for consistency
  ipcMain.handle('config:get-path-info', () => {
    const pathSeparator = process.platform === 'win32' ? ';' : ':';
    // Use enhanced PATH to match what Claude Agent SDK uses
    const enhancedPath = buildEnhancedPath();
    const pathEntries = enhancedPath.split(pathSeparator).filter((p) => p.trim());
    return {
      platform: process.platform,
      pathSeparator,
      pathEntries,
      pathCount: pathEntries.length,
      fullPath: enhancedPath
    };
  });

  // Get all environment variables (for debug/dev section)
  // Uses the same environment object as Claude Agent SDK query sessions for consistency
  // Masks sensitive variables like API keys, passwords, tokens, etc.
  ipcMain.handle('config:get-env-vars', () => {
    const sensitivePatterns = [
      /KEY/i,
      /SECRET/i,
      /PASSWORD/i,
      /TOKEN/i,
      /AUTH/i,
      /CREDENTIAL/i,
      /PRIVATE/i
    ];

    const maskValue = (key: string, value: string): string => {
      // Check if key matches any sensitive pattern
      const isSensitive = sensitivePatterns.some((pattern) => pattern.test(key));
      if (!isSensitive) {
        return value;
      }

      // Mask sensitive values
      if (value.length <= 8) {
        return '••••';
      }
      // Show first 4 and last 4 chars for longer values
      return `${value.slice(0, 4)}••••${value.slice(-4)}`;
    };

    // Use the same environment builder as Claude Agent SDK to ensure consistency
    const env = buildClaudeSessionEnv();

    const envVars: Array<{ key: string; value: string }> = [];
    for (const [key, value] of Object.entries(env)) {
      if (value !== undefined) {
        envVars.push({
          key,
          value: maskValue(key, value)
        });
      }
    }

    // Sort alphabetically by key
    envVars.sort((a, b) => a.key.localeCompare(b.key));

    return { envVars, count: envVars.length };
  });

  // Get app diagnostic metadata (versions, platform info, etc.)
  ipcMain.handle('config:get-diagnostic-metadata', () => {
    return {
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      chromiumVersion: process.versions.chrome,
      v8Version: process.versions.v8,
      nodeVersion: process.versions.node,
      claudeAgentSdkVersion: getClaudeAgentSdkVersion(),
      platform: process.platform,
      arch: process.arch,
      osRelease: release(),
      osType: type(),
      osVersion: version()
    };
  });
}
