# Claude Agent Desktop

Electron desktop application for agentic chat with the Claude Agent SDK.

## Technology

- **Framework:** Electron 39 (main / preload / renderer)
- **Build:** Vite 7 via electron-vite
- **UI:** React 19 + TypeScript, Tailwind CSS 4
- **Runtime:** Bun (package manager, scripts, tests)

## Layout

```
src/
├── main/       # Electron main process (app lifecycle + IPC handlers)
├── preload/    # Context bridge exposing safe IPC APIs
├── renderer/   # React UI
└── shared/     # Types shared between processes
.claude/        # Claude Agent SDK skills compiled into the app bundle
resources/      # Bundled runtime binaries (bun, uv, etc.)
scripts/        # Build hooks (preDev, beforeBuild, afterPack, runtime downloads)
static/         # Icons and static assets
```

## Skills integration

- Skills live in `.claude/skills/<skill-name>/` (each contains `SKILL.md` + `scripts/`).
- Built-in sample: `workspace-tools` with a depth-limited `list-directory` utility.
- `scripts/buildSkills.js` compiles TypeScript tools in `.claude/skills` to `out/.claude/skills/` using the root dependencies (no separate `.claude` package) and Bun `--compile`.
- Skill TypeScript is checked via the root `tsconfig.json`; there is no package.json or node_modules under `.claude`.
- `scripts/preDev.js` runs before `bun run dev` to download runtime binaries and build skills.
- `scripts/beforeBuild.js` runs during production builds to download binaries, copy runtime deps to `out/node_modules`, and build skills.
- `scripts/afterPack.js` trims unused vendor assets and confirms `.claude/skills` are present.
- On launch, `src/main/lib/config.ts` syncs the bundled `.claude` directory into the workspace so skills are available at runtime.

### Adding a skill

1. Create `.claude/skills/<skill-name>/SKILL.md` with `name` + `description`.
2. Add TypeScript tools under `.claude/skills/<skill-name>/scripts/`.
3. Run `bun run dev` (or rerun `scripts/buildSkills.js`) to compile binaries into `out/.claude/skills/`.
4. Launch the app; the workspace `.claude` folder will be refreshed automatically.

## Commands

```bash
bun install       # Install dependencies
bun run typecheck # TypeScript checks
bun run lint      # ESLint
bun run test      # Bun tests
bun run format    # Prettier
```

## Defaults

- Workspace defaults to `~/Desktop/claude-agent` (change in Settings).
- Anthropic API key can be provided via `ANTHROPIC_API_KEY` or stored locally in Settings.
- Bundled tools: bun + uv for runtime execution, portable Git/MSYS2 for Windows.
- Auto-updates: packaged builds check GitHub releases for updates; set `UPDATE_FEED_URL` to override the feed if needed (e.g., staging).

## Workflow

- After a series of code changes, **always** run: lint, typecheck, test, and format commands to ensure the code is working as expected.
- When drafting commit messages, **always** follow Conventional Commits format.
