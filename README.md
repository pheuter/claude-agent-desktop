# Claude Agent Desktop

![Claude Agent Desktop screenshot](https://github.com/user-attachments/assets/d7199fcc-a5ba-45ce-917a-e455ff430a2d)

> [!IMPORTANT]
> This project is not affiliated with [Anthropic](https://www.anthropic.com)

## Why This App?

The [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/overview) is a powerful toolkit for building AI agents that can execute code, manage files, search the web, and perform complex multi-step tasks. However, using it typically requires programming knowledge, terminal commands, and installing developer tools like Node.js, Python, and package managers.

**Claude Agent Desktop removes these barriers entirely.** Designed for all knowledge workers, not just engineers, it packages the full power of the Claude Agent SDK into a simple desktop application:

- **Zero technical setup** — All required runtimes are bundled: [bun](https://bun.sh) for JavaScript/TypeScript, [uv](https://docs.astral.sh/uv/) for Python, and portable Git/Unix tools for Windows. No installation of development tools needed.
- **Accessible workspace** — Your agent workspace defaults to `~/Desktop/claude-agent`, a shared environment for mutual collaboration. The agent can build applications, generate spreadsheets, and create documents here, while you can drag and drop your own files into the folder for the agent to analyze and work with.
- **Pre-configured [Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)** — Built-in capabilities for document handling, data analysis, and more are automatically available without any configuration.
- **Full agent capabilities** — Execute scripts, analyze files, create documents, automate workflows, and tackle complex knowledge work—all through natural conversation.

Whether you're a researcher analyzing data, a writer managing documents, or anyone who wants AI to actively work on your computer rather than just chat, this app lets you harness frontier agent capabilities without opening the terminal or writing a single line of code.

![Claude Agent Desktop screenshot](https://github.com/user-attachments/assets/6ff7054d-d50c-4535-bddf-e8bc500e418f)

## Download

Pre-built binaries for **macOS** and **Windows** are available on the [Releases page](https://github.com/pheuter/claude-agent-desktop/releases).

## Prerequisites

- Install [Bun](https://bun.sh/) (used for package management, scripts, and tests).
- Anthropic API key via `ANTHROPIC_API_KEY` or in app settings.

## Quick start

```bash
bun install
bun run dev      # builds skills, starts Electron + Vite
```

## Auto-updates

Packaged builds check this repository's GitHub Releases for updates via `electron-updater`. Set `GH_TOKEN` when running `electron-builder` to publish releases with update metadata, and optionally provide `UPDATE_FEED_URL` to point the app at a custom update server.
