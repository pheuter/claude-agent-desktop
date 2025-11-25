import { existsSync, readFileSync, writeFileSync } from 'fs';
import { cp, mkdir, rm } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { app } from 'electron';

import type { ChatModelPreference } from '../../shared/types/ipc';
import type { OAuthTokens } from './oauth';

export interface AppConfig {
  workspaceDir?: string;
  debugMode?: boolean;
  chatModelPreference?: ChatModelPreference | 'smart';
  apiKey?: string;
  anthropicBaseUrl?: string;
  oauthTokens?: OAuthTokens;
}

const DEFAULT_MODEL_PREFERENCE: ChatModelPreference = 'fast';
const DEFAULT_SMART_MODEL: ChatModelPreference = 'smart-sonnet';

function normalizeChatModelPreference(
  preference?: ChatModelPreference | 'smart' | null
): ChatModelPreference {
  switch (preference) {
    case 'fast':
      return 'fast';
    case 'smart-opus':
      return 'smart-opus';
    case 'smart':
    case 'smart-sonnet':
      return DEFAULT_SMART_MODEL;
    default:
      return DEFAULT_MODEL_PREFERENCE;
  }
}

function getConfigPath(): string {
  return join(app.getPath('userData'), 'config.json');
}

export function loadConfig(): AppConfig {
  try {
    const configPath = getConfigPath();
    if (existsSync(configPath)) {
      const data = readFileSync(configPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }
  return {};
}

export function saveConfig(config: AppConfig): void {
  try {
    writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

export function getApiKey(): string | null {
  const envApiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (envApiKey) {
    return envApiKey;
  }

  const storedApiKey = loadConfig().apiKey?.trim();
  return storedApiKey || null;
}

export function setApiKey(apiKey: string | null): void {
  const config = loadConfig();
  if (apiKey && apiKey.trim()) {
    config.apiKey = apiKey.trim();
  } else {
    delete config.apiKey;
  }
  saveConfig(config);
}

export function getAnthropicBaseUrl(): string | null {
  const envBaseUrl = process.env.ANTHROPIC_BASE_URL?.trim();
  if (envBaseUrl) {
    return envBaseUrl;
  }

  const storedBaseUrl = loadConfig().anthropicBaseUrl?.trim();
  return storedBaseUrl || null;
}

export function setAnthropicBaseUrl(baseUrl: string | null): void {
  const config = loadConfig();
  if (baseUrl && baseUrl.trim()) {
    config.anthropicBaseUrl = baseUrl.trim();
  } else {
    delete config.anthropicBaseUrl;
  }
  saveConfig(config);
}

export function getAnthropicBaseUrlStatus(): {
  configured: boolean;
  source: 'env' | 'local' | null;
  url: string | null;
} {
  const envBaseUrl = process.env.ANTHROPIC_BASE_URL?.trim();
  if (envBaseUrl) {
    return { configured: true, source: 'env', url: envBaseUrl };
  }

  const storedBaseUrl = loadConfig().anthropicBaseUrl?.trim();
  if (storedBaseUrl) {
    return { configured: true, source: 'local', url: storedBaseUrl };
  }

  return { configured: false, source: null, url: null };
}

function getApiKeyLastFour(key: string | null | undefined): string | null {
  if (!key) {
    return null;
  }
  const trimmed = key.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(-4);
}

export function getApiKeyStatus(): {
  configured: boolean;
  source: 'env' | 'local' | null;
  lastFour: string | null;
} {
  const envApiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (envApiKey) {
    return { configured: true, source: 'env', lastFour: getApiKeyLastFour(envApiKey) };
  }

  const storedApiKey = loadConfig().apiKey?.trim();
  if (storedApiKey) {
    return { configured: true, source: 'local', lastFour: getApiKeyLastFour(storedApiKey) };
  }

  return { configured: false, source: null, lastFour: null };
}

export function getWorkspaceDir(): string {
  const config = loadConfig();
  if (config.workspaceDir) {
    return config.workspaceDir;
  }
  // Default to Desktop/claude-agent
  return join(app.getPath('desktop'), 'claude-agent');
}

export function getDebugMode(): boolean {
  const config = loadConfig();
  return config.debugMode ?? false; // Default to false
}

export function getChatModelPreferenceSetting(): ChatModelPreference {
  const config = loadConfig();
  return normalizeChatModelPreference(config.chatModelPreference);
}

export function setChatModelPreferenceSetting(preference: ChatModelPreference): void {
  const config = loadConfig();
  config.chatModelPreference = normalizeChatModelPreference(preference);
  saveConfig(config);
}

export function getBundledBunPath(): string {
  // Return the path to the bundled bun executable
  // In development: resources/bun in project root
  // In production: app.asar.unpacked not needed as resources/ is at top level
  const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL;
  const bunName = process.platform === 'win32' ? 'bun.exe' : 'bun';
  if (isDev) {
    // In dev, resources/ is in the project root
    return join(app.getAppPath(), 'resources', bunName);
  } else {
    // In production, resources/ is at the app bundle root
    return join(process.resourcesPath, bunName);
  }
}

export function getBundledUvPath(): string {
  // Return the path to the bundled uv executable (Python package manager)
  // In development: resources/uv in project root
  // In production: resources/ is at the app bundle root
  const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL;
  const uvName = process.platform === 'win32' ? 'uv.exe' : 'uv';
  if (isDev) {
    // In dev, resources/ is in the project root
    return join(app.getAppPath(), 'resources', uvName);
  } else {
    // In production, resources/ is at the app bundle root
    return join(process.resourcesPath, uvName);
  }
}

export function getBundledGitPath(): string | null {
  // Return the path to the bundled Git directory (Windows only)
  // In development: resources/git-portable in project root
  // In production: resources/ is at the app bundle root
  if (process.platform !== 'win32') {
    return null; // Only Windows has bundled Git
  }

  const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL;
  if (isDev) {
    // In dev, resources/ is in the project root
    return join(app.getAppPath(), 'resources', 'git-portable');
  } else {
    // In production, resources/ is at the app bundle root
    return join(process.resourcesPath, 'git-portable');
  }
}

export function getBundledMsys2Path(): string | null {
  // Return the path to the bundled MSYS2 directory (Windows only)
  // MSYS2 provides bash, awk, sed, and other unix utilities
  // In development: resources/msys2 in project root
  // In production: resources/ is at the app bundle root
  if (process.platform !== 'win32') {
    return null; // Only Windows has bundled MSYS2
  }

  const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL;
  if (isDev) {
    // In dev, resources/ is in the project root
    return join(app.getAppPath(), 'resources', 'msys2');
  } else {
    // In production, resources/ is at the app bundle root
    return join(process.resourcesPath, 'msys2');
  }
}

/**
 * Checks if a bash.exe path is from MSYS2 (as opposed to Git Bash).
 * MSYS2 bash needs special environment variables to properly inherit Windows env vars.
 */
export function isMsys2Bash(bashExePath: string | null): boolean {
  if (!bashExePath || process.platform !== 'win32') {
    return false;
  }

  const normalizedPath = resolve(bashExePath).toLowerCase();

  // Check if it's the bundled MSYS2 bash
  const bundledMsys2Path = getBundledMsys2Path();
  if (bundledMsys2Path) {
    const msys2BashExe = resolve(join(bundledMsys2Path, 'usr', 'bin', 'bash.exe')).toLowerCase();
    if (normalizedPath === msys2BashExe) {
      return true;
    }
  }

  // Check if path contains 'msys2' or 'msys64' (common MSYS2 installation paths)
  return normalizedPath.includes('msys2') || normalizedPath.includes('msys64');
}

/**
 * Finds the path to bash.exe for Claude Code on Windows.
 * Checks bundled Git, bundled MSYS2, and system Git installations in order.
 * Returns null if bash.exe cannot be found.
 */
export function getBashExePath(): string | null {
  if (process.platform !== 'win32') {
    return null; // Only needed on Windows
  }

  // 1. Check bundled Git (git-portable/usr/bin/bash.exe)
  const bundledGitPath = getBundledGitPath();
  if (bundledGitPath) {
    const gitBashExe = join(bundledGitPath, 'usr', 'bin', 'bash.exe');
    if (existsSync(gitBashExe)) {
      return resolve(gitBashExe);
    }
  }

  // 2. Check bundled MSYS2 (msys2/usr/bin/bash.exe)
  const bundledMsys2Path = getBundledMsys2Path();
  if (bundledMsys2Path) {
    const msys2BashExe = join(bundledMsys2Path, 'usr', 'bin', 'bash.exe');
    if (existsSync(msys2BashExe)) {
      return resolve(msys2BashExe);
    }
  }

  // 3. Check common system Git installation paths
  const programFiles = process.env.PROGRAMFILES || 'C:\\Program Files';
  const programFilesX86 =
    process.env['ProgramFiles(x86)'] || process.env.PROGRAMFILES_X86 || 'C:\\Program Files (x86)';

  const commonGitPaths = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    join(programFiles, 'Git', 'bin', 'bash.exe'),
    join(programFilesX86, 'Git', 'bin', 'bash.exe')
  ];

  for (const gitBashPath of commonGitPaths) {
    if (existsSync(gitBashPath)) {
      return resolve(gitBashPath);
    }
  }

  // 4. Check if bash.exe is in PATH
  const pathEntries = (process.env.PATH || '').split(';');
  for (const pathEntry of pathEntries) {
    const bashExe = join(pathEntry.trim(), 'bash.exe');
    if (existsSync(bashExe)) {
      return resolve(bashExe);
    }
  }

  return null;
}

/**
 * Builds an enhanced PATH that includes all bundled binaries (bun, uv, git, msys2)
 * and filters out duplicates from the user's existing PATH.
 * This ensures consistent PATH setup for both the Electron app and Claude Agent SDK.
 */
export function buildEnhancedPath(): string {
  const pathSeparator = process.platform === 'win32' ? ';' : ':';

  // Collect all bundled binary directories
  const bundledBinDirs: string[] = [
    resolve(dirname(getBundledBunPath())),
    resolve(dirname(getBundledUvPath()))
  ];

  // Add Git paths (Windows only)
  const bundledGitPath = getBundledGitPath();
  if (bundledGitPath) {
    const gitPaths = ['bin', 'mingw64/bin', 'cmd']
      .map((subpath) => resolve(join(bundledGitPath, subpath)))
      .filter((p) => existsSync(p));
    bundledBinDirs.push(...gitPaths);
  }

  // Add MSYS2 paths (Windows only)
  const bundledMsys2Path = getBundledMsys2Path();
  if (bundledMsys2Path) {
    const msys2Paths = ['usr/bin', 'mingw64/bin']
      .map((subpath) => resolve(join(bundledMsys2Path, subpath)))
      .filter((p) => existsSync(p));
    bundledBinDirs.push(...msys2Paths);
  }

  // Normalize paths for comparison (case-insensitive on Windows)
  const normalize = (p: string): string => {
    const normalized = resolve(p);
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
  };

  const bundledPathsSet = new Set(bundledBinDirs.map(normalize));

  // Filter out bundled paths from user PATH to avoid duplicates
  const userPathEntries = (process.env.PATH || '').split(pathSeparator).filter((entry) => {
    const trimmed = entry.trim();
    return trimmed && !bundledPathsSet.has(normalize(trimmed));
  });

  // Combine: bundled binaries first, then user PATH
  return [...bundledBinDirs, ...userPathEntries].join(pathSeparator);
}

/**
 * Builds the complete environment object used by Claude Agent SDK query sessions.
 * This ensures consistency across the Electron app, Claude Agent SDK, and debug panel.
 *
 * The environment includes:
 * - All process.env variables
 * - ANTHROPIC_API_KEY (from env or local config)
 * - PATH (enhanced with bundled binaries)
 * - CLAUDE_CODE_GIT_BASH_PATH (Windows only, if bash.exe found)
 * - MSYSTEM, MSYS2_PATH_TYPE, and HOME (Windows only, if MSYS2 bash detected - required for PATH inheritance and cwd)
 * - DEBUG (if debug mode enabled)
 */
export function buildClaudeSessionEnv(): Record<string, string> {
  const enhancedPath = buildEnhancedPath();
  const apiKey = getApiKey();
  const workspaceDir = getWorkspaceDir();

  const env: Record<string, string> = {
    ...process.env,
    PATH: enhancedPath
  };

  // Add API key if available
  if (apiKey) {
    env.ANTHROPIC_API_KEY = apiKey;
  }

  // Set CLAUDE_CODE_GIT_BASH_PATH for Windows (required by Claude Code)
  if (process.platform === 'win32') {
    const bashExePath = getBashExePath();
    if (bashExePath) {
      env.CLAUDE_CODE_GIT_BASH_PATH = bashExePath;

      // MSYS2 bash requires special environment variables to properly inherit
      // Windows environment variables and PATH. Without these, env vars and binaries
      // (like bun, uv) passed to the SDK won't be available inside the bash session.
      if (isMsys2Bash(bashExePath)) {
        // MSYSTEM tells MSYS2 which environment to use (MSYS, MINGW64, etc.)
        env.MSYSTEM = 'MSYS';
        // MSYS2_PATH_TYPE=inherit ensures Windows PATH is inherited and converted properly
        env.MSYS2_PATH_TYPE = 'inherit';
        // HOME set to workspace directory ensures bash starts in the correct cwd
        // MSYS2 will automatically convert Windows paths to Unix-style paths
        env.HOME = resolve(workspaceDir);
      }
    }
  }

  // Enable debug mode if configured
  if (getDebugMode()) {
    env.DEBUG = '1';
  }

  return env;
}

export async function ensureWorkspaceDir(): Promise<void> {
  const workspaceDir = getWorkspaceDir();
  if (!existsSync(workspaceDir)) {
    await mkdir(workspaceDir, { recursive: true });
  }

  // Always sync .claude directory - delete and replace to ensure clean state
  try {
    // .claude directory is at out/.claude in both dev and production
    // In development: buildSkills.js builds to out/.claude, app.getAppPath() returns project root
    // In production: .claude is unpacked to app.asar.unpacked/out/.claude
    const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL;
    const sourceClaudeDir =
      isDev ?
        join(app.getAppPath(), 'out', '.claude')
      : join(process.resourcesPath, 'app.asar.unpacked', 'out', '.claude');

    if (existsSync(sourceClaudeDir)) {
      console.log('Syncing .claude directory to workspace...');
      const destClaudeDir = join(workspaceDir, '.claude');

      // Remove existing .claude directory if it exists
      if (existsSync(destClaudeDir)) {
        await rm(destClaudeDir, { recursive: true, force: true });
      }

      // Copy entire .claude directory (including skills)
      await cp(sourceClaudeDir, destClaudeDir, { recursive: true });
      console.log('.claude directory synced successfully');
    } else {
      console.warn(`Could not find .claude directory at ${sourceClaudeDir}`);
    }
  } catch (error) {
    console.error('Failed to sync .claude directory:', error);
  }
}
