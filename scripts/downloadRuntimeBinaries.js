import { spawnSync } from 'child_process';
import { randomUUID } from 'crypto';
import {
  chmodSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = join(__dirname, '..');
const resourcesDir = join(projectDir, 'resources');

// Target versions
const BUN_VERSION = '1.3.3';
const UV_VERSION = '0.9.11';
const JQ_VERSION = '1.8.1';
const PORTABLE_GIT_VERSION = '2.47.1'; // Git for Windows portable version
const MSYS2_VERSION = 'latest'; // MSYS2 base system (includes bash, awk, sed, unix tools) - using latest release

// Platform and architecture detection
const PLATFORM = process.platform;
const ARCH =
  process.arch === 'x64' ? 'x64'
  : process.arch === 'arm64' ? 'aarch64'
  : process.arch;

// Platform-specific binary names
const BUN_BINARY_NAME = PLATFORM === 'win32' ? 'bun.exe' : 'bun';
const UV_BINARY_NAME = PLATFORM === 'win32' ? 'uv.exe' : 'uv';
const JQ_BINARY_NAME = 'jq.exe';

/**
 * Reads the current version from a version file
 */
function getCurrentVersion(versionFile) {
  if (!existsSync(versionFile)) {
    return null;
  }
  try {
    return readFileSync(versionFile, 'utf-8').trim();
  } catch {
    return null;
  }
}

/**
 * Downloads a file from a URL
 */
async function downloadFile(url, destination) {
  console.log(`Downloading from ${url}...`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const fileStream = createWriteStream(destination);
  await pipeline(Readable.fromWeb(response.body), fileStream);
  console.log(`Downloaded to ${destination}`);
}

/**
 * Extracts a tar.gz file using system tar command
 */
function extractTarGz(archivePath, targetDir) {
  console.log(`Extracting ${archivePath}...`);

  // tar is available on Windows 10 1903+ and Unix-like systems
  const result = spawnSync('tar', ['-xzf', archivePath, '-C', targetDir], {
    stdio: 'inherit',
    shell: PLATFORM === 'win32'
  });

  if (result.status !== 0) {
    throw new Error(
      'Failed to extract tar.gz file. Ensure tar is available (Windows 10 1903+ includes tar).'
    );
  }
}

/**
 * Extracts a zip file (for bun)
 */
function extractZip(archivePath, targetDir) {
  console.log(`Extracting ${archivePath}...`);

  // Ensure target directory exists
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  if (PLATFORM === 'win32') {
    // On Windows, use PowerShell Expand-Archive
    // Use -ErrorAction Stop to get proper error messages
    // Escape paths for PowerShell
    const escapedArchivePath = archivePath.replace(/"/g, '`"');
    const escapedTargetDir = targetDir.replace(/"/g, '`"');
    const result = spawnSync(
      'powershell',
      [
        '-Command',
        `$ErrorActionPreference = 'Stop'; Expand-Archive -Path "${escapedArchivePath}" -DestinationPath "${escapedTargetDir}" -Force`
      ],
      { stdio: 'inherit', shell: false }
    );
    if (result.status !== 0) {
      throw new Error(`Failed to extract zip file: PowerShell exited with code ${result.status}`);
    }
  } else {
    const result = spawnSync('unzip', ['-o', '-q', archivePath, '-d', targetDir], {
      stdio: 'inherit'
    });
    if (result.status !== 0) {
      throw new Error(`Failed to extract zip file: unzip exited with code ${result.status}`);
    }
  }
}

/**
 * Downloads and installs bun binary
 */
async function downloadBun() {
  const bunPath = join(resourcesDir, BUN_BINARY_NAME);
  const bunVersionFile = join(resourcesDir, '.bun-version');
  const currentVersion = getCurrentVersion(bunVersionFile);

  // Check if we need to download
  if (existsSync(bunPath) && currentVersion === BUN_VERSION) {
    console.log(`Bun v${BUN_VERSION} already exists, skipping download.`);
    return;
  }

  console.log(`Downloading bun v${BUN_VERSION} for ${PLATFORM}-${ARCH}...`);

  // Map platform names for bun releases
  const bunPlatform = PLATFORM === 'win32' ? 'windows' : PLATFORM;
  const bunArch =
    ARCH === 'x64' ? 'x64'
    : ARCH === 'aarch64' ? 'aarch64'
    : ARCH;

  const bunUrl = `https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-${bunPlatform}-${bunArch}.zip`;
  const tempArchive = join(resourcesDir, 'bun.zip');
  const tempExtractDir = join(tmpdir(), `bun-temp-${randomUUID()}`);

  // Download
  await downloadFile(bunUrl, tempArchive);

  // Clean up any existing temp extract directory
  if (existsSync(tempExtractDir)) {
    try {
      rmSync(tempExtractDir, { recursive: true, force: true, maxRetries: 3 });
    } catch (error) {
      // If removal fails, try to continue - mkdirSync with recursive should handle it
      console.warn(`Warning: Could not remove existing temp directory: ${error.message}`);
    }
  }

  // Ensure temp extract directory exists (recursive will create parent dirs if needed)
  if (!existsSync(tempExtractDir)) {
    try {
      mkdirSync(tempExtractDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create temp directory ${tempExtractDir}: ${error.message}`);
    }
  }

  // Extract
  extractZip(tempArchive, tempExtractDir);

  // Move the binary from extracted directory to target location
  const extractedBinaryPath = join(
    tempExtractDir,
    `bun-${bunPlatform}-${bunArch}`,
    BUN_BINARY_NAME
  );
  if (!existsSync(extractedBinaryPath)) {
    throw new Error(`Extracted bun binary not found at ${extractedBinaryPath}`);
  }

  // Copy to target location
  const { cpSync } = await import('fs');
  cpSync(extractedBinaryPath, bunPath);

  // Make executable (skip on Windows)
  if (PLATFORM !== 'win32') {
    chmodSync(bunPath, 0o755);
  }

  // Clean up
  rmSync(tempArchive);
  rmSync(tempExtractDir, { recursive: true });

  // Write version file
  writeFileSync(bunVersionFile, BUN_VERSION);

  console.log(`✓ Bun v${BUN_VERSION} installed successfully`);
}

/**
 * Downloads and installs uv binary
 */
async function downloadUv() {
  const uvPath = join(resourcesDir, UV_BINARY_NAME);
  const uvVersionFile = join(resourcesDir, '.uv-version');
  const currentVersion = getCurrentVersion(uvVersionFile);

  // Check if we need to download
  if (existsSync(uvPath) && currentVersion === UV_VERSION) {
    console.log(`UV v${UV_VERSION} already exists, skipping download.`);
    return;
  }

  console.log(`Downloading uv v${UV_VERSION} for ${PLATFORM}-${ARCH}...`);

  let uvUrl;
  let archiveExt;
  let extractedDirName;

  if (PLATFORM === 'win32') {
    // Windows: uv-x86_64-pc-windows-msvc.zip
    const uvArch = ARCH === 'x64' ? 'x86_64' : ARCH;
    uvUrl = `https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/uv-${uvArch}-pc-windows-msvc.zip`;
    archiveExt = '.zip';
    extractedDirName = `uv-${uvArch}-pc-windows-msvc`;
  } else if (PLATFORM === 'darwin') {
    // macOS: uv-aarch64-apple-darwin.tar.gz or uv-x86_64-apple-darwin.tar.gz
    const uvArch = ARCH === 'aarch64' ? 'aarch64' : 'x86_64';
    uvUrl = `https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/uv-${uvArch}-apple-${PLATFORM}.tar.gz`;
    archiveExt = '.tar.gz';
    extractedDirName = `uv-${uvArch}-apple-${PLATFORM}`;
  } else {
    // Linux: uv-x86_64-unknown-linux-gnu.tar.gz or uv-aarch64-unknown-linux-gnu.tar.gz
    const uvArch = ARCH === 'aarch64' ? 'aarch64' : 'x86_64';
    uvUrl = `https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/uv-${uvArch}-unknown-linux-gnu.tar.gz`;
    archiveExt = '.tar.gz';
    extractedDirName = `uv-${uvArch}-unknown-linux-gnu`;
  }

  const tempArchive = join(resourcesDir, `uv${archiveExt}`);
  const tempExtractDir = join(tmpdir(), `uv-temp-${randomUUID()}`);

  // Download
  await downloadFile(uvUrl, tempArchive);

  // Clean up any existing temp extract directory
  if (existsSync(tempExtractDir)) {
    try {
      rmSync(tempExtractDir, { recursive: true, force: true, maxRetries: 3 });
    } catch (error) {
      // If removal fails, try to continue - mkdirSync with recursive should handle it
      console.warn(`Warning: Could not remove existing temp directory: ${error.message}`);
    }
  }

  // Ensure temp extract directory exists (recursive will create parent dirs if needed)
  if (!existsSync(tempExtractDir)) {
    try {
      mkdirSync(tempExtractDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create temp directory ${tempExtractDir}: ${error.message}`);
    }
  }

  // Extract
  if (archiveExt === '.zip') {
    extractZip(tempArchive, tempExtractDir);
  } else {
    extractTarGz(tempArchive, tempExtractDir);
  }

  // Move the binary from extracted directory to target location
  // Try the expected path first (with subdirectory)
  let extractedBinaryPath = join(tempExtractDir, extractedDirName, UV_BINARY_NAME);

  // If not found, try direct path (binary might be at root of extraction)
  if (!existsSync(extractedBinaryPath)) {
    extractedBinaryPath = join(tempExtractDir, UV_BINARY_NAME);
  }

  // If still not found, search for it
  if (!existsSync(extractedBinaryPath)) {
    const { readdirSync } = await import('fs');
    const entries = readdirSync(tempExtractDir, { withFileTypes: true });
    const foundBinary =
      entries.find((entry) => entry.isFile() && entry.name === UV_BINARY_NAME) ||
      entries.find(
        (entry) =>
          entry.isDirectory() && existsSync(join(tempExtractDir, entry.name, UV_BINARY_NAME))
      );

    if (foundBinary) {
      if (foundBinary.isFile()) {
        extractedBinaryPath = join(tempExtractDir, foundBinary.name);
      } else {
        extractedBinaryPath = join(tempExtractDir, foundBinary.name, UV_BINARY_NAME);
      }
    } else {
      throw new Error(
        `Extracted uv binary not found. Searched in ${tempExtractDir}. Contents: ${entries.map((e) => e.name).join(', ')}`
      );
    }
  }

  // Copy to target location
  const { cpSync } = await import('fs');
  cpSync(extractedBinaryPath, uvPath);

  // Make executable (skip on Windows)
  if (PLATFORM !== 'win32') {
    chmodSync(uvPath, 0o755);
  }

  // Clean up
  rmSync(tempArchive);
  rmSync(tempExtractDir, { recursive: true });

  // Write version file
  writeFileSync(uvVersionFile, UV_VERSION);

  console.log(`✓ UV v${UV_VERSION} installed successfully`);
}

/**
 * Downloads and installs jq binary (Windows only)
 */
async function downloadJq() {
  // Only download jq on Windows
  if (PLATFORM !== 'win32') {
    return;
  }

  const jqPath = join(resourcesDir, JQ_BINARY_NAME);
  const jqVersionFile = join(resourcesDir, '.jq-version');
  const currentVersion = getCurrentVersion(jqVersionFile);

  // Check if we need to download
  if (existsSync(jqPath) && currentVersion === JQ_VERSION) {
    console.log(`jq v${JQ_VERSION} already exists, skipping download.`);
    return;
  }

  console.log(`Downloading jq v${JQ_VERSION} for Windows...`);

  const jqUrl = `https://github.com/jqlang/jq/releases/download/jq-${JQ_VERSION}/jq-windows-amd64.exe`;

  // Download directly (jq is a single executable, not an archive)
  await downloadFile(jqUrl, jqPath);

  // Write version file
  writeFileSync(jqVersionFile, JQ_VERSION);

  console.log(`✓ jq v${JQ_VERSION} installed successfully`);
}

/**
 * Downloads and installs PortableGit (Windows only)
 */
async function downloadPortableGit() {
  // Only download PortableGit on Windows
  if (PLATFORM !== 'win32') {
    return;
  }

  const gitDir = join(resourcesDir, 'git-portable');
  const gitVersionFile = join(resourcesDir, '.git-portable-version');
  const gitExePath = join(gitDir, 'bin', 'git.exe');
  const currentVersion = getCurrentVersion(gitVersionFile);

  // Check if we need to download (check for git.exe as indicator)
  if (existsSync(gitExePath) && currentVersion === PORTABLE_GIT_VERSION) {
    console.log(`PortableGit v${PORTABLE_GIT_VERSION} already exists, skipping download.`);
    return;
  }

  console.log(`Downloading PortableGit v${PORTABLE_GIT_VERSION} for Windows...`);

  // PortableGit download URL from Git for Windows releases
  // Format: https://github.com/git-for-windows/git/releases/download/v{VERSION}.windows.1/PortableGit-{VERSION}-64-bit.7z.exe
  const gitUrl = `https://github.com/git-for-windows/git/releases/download/v${PORTABLE_GIT_VERSION}.windows.1/PortableGit-${PORTABLE_GIT_VERSION}-64-bit.7z.exe`;

  const tempArchive = join(resourcesDir, 'PortableGit.7z.exe');
  const tempExtractDir = join(tmpdir(), `git-portable-temp-${randomUUID()}`);

  // Download
  await downloadFile(gitUrl, tempArchive);

  // Clean up any existing temp extract directory
  if (existsSync(tempExtractDir)) {
    try {
      rmSync(tempExtractDir, { recursive: true, force: true, maxRetries: 3 });
    } catch (error) {
      console.warn(`Warning: Could not remove existing temp directory: ${error.message}`);
    }
  }

  // Ensure temp extract directory exists
  if (!existsSync(tempExtractDir)) {
    try {
      mkdirSync(tempExtractDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create temp directory ${tempExtractDir}: ${error.message}`);
    }
  }

  // Extract using 7-Zip (7z.exe is available on Windows 10+)
  // PortableGit comes as a self-extracting 7z archive
  console.log(`Extracting PortableGit...`);
  const extractResult = spawnSync(tempArchive, ['-o' + tempExtractDir, '-y'], {
    stdio: 'inherit',
    shell: false
  });

  if (extractResult.status !== 0) {
    // Try alternative: use 7z if available
    const sevenZResult = spawnSync('7z', ['x', tempArchive, `-o${tempExtractDir}`, '-y'], {
      stdio: 'inherit',
      shell: false
    });

    if (sevenZResult.status !== 0) {
      throw new Error(
        'Failed to extract PortableGit. The archive is a self-extracting 7z file. ' +
          'Please ensure 7-Zip is installed or run the downloaded file manually.'
      );
    }
  }

  // Find the extracted PortableGit directory
  // PortableGit extracts to a directory like "PortableGit-{version}-64-bit" or directly to root
  const { readdirSync } = await import('fs');
  const entries = readdirSync(tempExtractDir, { withFileTypes: true });
  let extractedGitDir = null;

  // Look for directory containing bin/git.exe (verify it has the full PortableGit structure)
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const candidatePath = join(tempExtractDir, entry.name);
      const candidateGitExe = join(candidatePath, 'bin', 'git.exe');
      const candidateBashExe = join(candidatePath, 'usr', 'bin', 'bash.exe');
      // Check for both git.exe and bash.exe to ensure we have the full PortableGit
      if (existsSync(candidateGitExe) && existsSync(candidateBashExe)) {
        extractedGitDir = candidatePath;
        break;
      }
      // Fallback: just check for git.exe if bash.exe check fails
      if (!extractedGitDir && existsSync(candidateGitExe)) {
        extractedGitDir = candidatePath;
      }
    }
  }

  // If no subdirectory found, check if git.exe is directly in tempExtractDir/bin
  if (!extractedGitDir) {
    const directGitExe = join(tempExtractDir, 'bin', 'git.exe');
    const directBashExe = join(tempExtractDir, 'usr', 'bin', 'bash.exe');
    if (existsSync(directGitExe)) {
      extractedGitDir = tempExtractDir;
      // Warn if bash.exe is missing (but don't fail - might be in a different location)
      if (!existsSync(directBashExe)) {
        console.warn(
          `Warning: bash.exe not found at ${directBashExe}. ` +
            `PortableGit may be missing some unix utilities.`
        );
      }
    }
  }

  if (!extractedGitDir) {
    throw new Error(
      `PortableGit extraction failed: Could not find bin/git.exe in extracted files. ` +
        `Contents: ${entries.map((e) => e.name).join(', ')}`
    );
  }

  // Remove existing git-portable directory if it exists
  if (existsSync(gitDir)) {
    rmSync(gitDir, { recursive: true, force: true, maxRetries: 3 });
  }

  // Copy extracted directory to target location
  const { cpSync } = await import('fs');
  cpSync(extractedGitDir, gitDir, { recursive: true });

  // Verify essential tools are present
  const essentialTools = [
    { path: join(gitDir, 'bin', 'git.exe'), name: 'git' },
    { path: join(gitDir, 'usr', 'bin', 'bash.exe'), name: 'bash' },
    { path: join(gitDir, 'usr', 'bin', 'awk.exe'), name: 'awk' },
    { path: join(gitDir, 'usr', 'bin', 'sed.exe'), name: 'sed' }
  ];

  const missingTools = essentialTools.filter((tool) => !existsSync(tool.path));
  if (missingTools.length > 0) {
    console.warn(
      `Warning: PortableGit is missing some tools: ${missingTools.map((t) => t.name).join(', ')}`
    );
    console.warn('These tools may be required for Claude Agent SDK to work properly.');
  } else {
    console.log('✓ Verified PortableGit includes essential tools (git, bash, awk, sed)');
  }

  // Clean up
  rmSync(tempArchive);
  rmSync(tempExtractDir, { recursive: true });

  // Write version file
  writeFileSync(gitVersionFile, PORTABLE_GIT_VERSION);

  console.log(`✓ PortableGit v${PORTABLE_GIT_VERSION} installed successfully`);
}

/**
 * Downloads and installs MSYS2 base system (Windows only)
 * MSYS2 provides bash, awk, sed, and other unix utilities
 */
async function downloadMsys2() {
  // Only download MSYS2 on Windows
  if (PLATFORM !== 'win32') {
    return;
  }

  const msys2Dir = join(resourcesDir, 'msys2');
  const msys2VersionFile = join(resourcesDir, '.msys2-version');
  const bashExePath = join(msys2Dir, 'usr', 'bin', 'bash.exe');
  const currentVersion = getCurrentVersion(msys2VersionFile);

  // Check if we need to download (check for bash.exe as indicator)
  // For 'latest', always check if bash.exe exists - if it does, assume it's current
  if (existsSync(bashExePath)) {
    if (MSYS2_VERSION === 'latest' || currentVersion === MSYS2_VERSION) {
      console.log(`MSYS2 already exists, skipping download.`);
      return;
    }
  }

  console.log(`Downloading MSYS2 base system (latest) for Windows...`);

  // MSYS2 download URL - using the official distribution repository
  // MSYS2 moved from GitHub releases to repo.msys2.org/distrib/
  // Using .sfx.exe self-extracting archive (no external tools needed)
  // Using a recent version - update the date as needed for newer releases
  // Latest files available at: https://repo.msys2.org/distrib/x86_64/
  // Pattern: msys2-base-x86_64-{YYYYMMDD}.sfx.exe
  const msys2Url = 'https://repo.msys2.org/distrib/x86_64/msys2-base-x86_64-20241116.sfx.exe';

  const tempArchive = join(resourcesDir, 'msys2.sfx.exe');
  const tempExtractDir = join(tmpdir(), `msys2-temp-${randomUUID()}`);

  // Download
  await downloadFile(msys2Url, tempArchive);

  // Clean up any existing temp extract directory
  if (existsSync(tempExtractDir)) {
    try {
      rmSync(tempExtractDir, { recursive: true, force: true, maxRetries: 3 });
    } catch (error) {
      console.warn(`Warning: Could not remove existing temp directory: ${error.message}`);
    }
  }

  // Ensure temp extract directory exists
  if (!existsSync(tempExtractDir)) {
    try {
      mkdirSync(tempExtractDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create temp directory ${tempExtractDir}: ${error.message}`);
    }
  }

  // Extract .sfx.exe - MSYS2 .sfx.exe files are 7z-based self-extracting archives
  // They can be extracted by running with -o flag (similar to PortableGit)
  console.log(`Extracting MSYS2...`);

  // Try running the .sfx.exe with extraction flags (silent extraction to target dir)
  // MSYS2 .sfx.exe supports: -o"output_dir" -y (yes to all prompts)
  const extractResult = spawnSync(tempArchive, [`-o${tempExtractDir}`, '-y'], {
    stdio: 'inherit',
    shell: false,
    cwd: resourcesDir
  });

  // If that failed, try using 7z if available (fallback)
  if (extractResult.status !== 0) {
    const sevenZResult = spawnSync('7z', ['x', tempArchive, `-o${tempExtractDir}`, '-y'], {
      stdio: 'inherit',
      shell: false
    });

    if (sevenZResult.status !== 0) {
      throw new Error(
        'Failed to extract MSYS2. Tried self-extraction and 7-Zip. ' +
          'The .sfx.exe file should extract automatically. ' +
          'If this fails, please ensure 7-Zip (7z.exe) is installed and available in PATH, ' +
          'or manually run the downloaded .sfx.exe file.'
      );
    }
  }

  // Find the extracted MSYS2 directory
  // MSYS2 extracts to a directory like "msys64" or similar
  const { readdirSync } = await import('fs');
  const entries = readdirSync(tempExtractDir, { withFileTypes: true });
  let extractedMsys2Dir = null;

  // Look for directory containing usr/bin/bash.exe
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const candidatePath = join(tempExtractDir, entry.name);
      const candidateBashExe = join(candidatePath, 'usr', 'bin', 'bash.exe');
      if (existsSync(candidateBashExe)) {
        extractedMsys2Dir = candidatePath;
        break;
      }
    }
  }

  // If no subdirectory found, check if bash.exe is directly in tempExtractDir/usr/bin
  if (!extractedMsys2Dir) {
    const directBashExe = join(tempExtractDir, 'usr', 'bin', 'bash.exe');
    if (existsSync(directBashExe)) {
      extractedMsys2Dir = tempExtractDir;
    }
  }

  if (!extractedMsys2Dir) {
    throw new Error(
      `MSYS2 extraction failed: Could not find usr/bin/bash.exe in extracted files. ` +
        `Contents: ${entries.map((e) => e.name).join(', ')}`
    );
  }

  // Remove existing msys2 directory if it exists
  if (existsSync(msys2Dir)) {
    rmSync(msys2Dir, { recursive: true, force: true, maxRetries: 3 });
  }

  // Copy extracted directory to target location
  const { cpSync } = await import('fs');
  cpSync(extractedMsys2Dir, msys2Dir, { recursive: true });

  // Verify essential tools are present
  const essentialTools = [
    { path: join(msys2Dir, 'usr', 'bin', 'bash.exe'), name: 'bash' },
    { path: join(msys2Dir, 'usr', 'bin', 'awk.exe'), name: 'awk' },
    { path: join(msys2Dir, 'usr', 'bin', 'sed.exe'), name: 'sed' },
    { path: join(msys2Dir, 'usr', 'bin', 'grep.exe'), name: 'grep' }
  ];

  const missingTools = essentialTools.filter((tool) => !existsSync(tool.path));
  if (missingTools.length > 0) {
    throw new Error(
      `MSYS2 is missing essential tools: ${missingTools.map((t) => t.name).join(', ')}. ` +
        `Extraction may have failed.`
    );
  }

  console.log('✓ Verified MSYS2 includes essential tools (bash, awk, sed, grep)');

  // Clean up
  rmSync(tempArchive);
  rmSync(tempExtractDir, { recursive: true });

  // Write version file with 'latest' to indicate we're using the latest release
  writeFileSync(msys2VersionFile, MSYS2_VERSION);

  console.log(`✓ MSYS2 (latest) installed successfully`);
}

/**
 * Main function
 */
async function main() {
  console.log('\n=== Downloading Runtime Binaries ===\n');

  // Ensure resources directory exists
  mkdirSync(resourcesDir, { recursive: true });

  try {
    await downloadBun();
    await downloadUv();
    await downloadJq();
    await downloadPortableGit();
    await downloadMsys2();
    console.log('\n✓ All runtime binaries ready\n');
  } catch (error) {
    console.error('\n✗ Failed to download runtime binaries:', error.message);
    process.exit(1);
  }
}

// Run if called directly
// Check if this script is being run directly (not imported)
// Use path resolution to handle Windows path differences
const currentFile = resolve(fileURLToPath(import.meta.url));
const scriptArg = process.argv[1] ? resolve(process.argv[1]) : '';
const isMainModule =
  currentFile === scriptArg || currentFile.toLowerCase() === scriptArg.toLowerCase();

if (isMainModule) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default main;
