# Editor

A small desktop video editor for Windows, macOS, and Linux. Open a video, cut it into clips, reorder and trim them, add text and image overlays, and export an MP4.

## Set up

You need Node.js 22 and pnpm 10.

```sh
pnpm install
pnpm dev
```

`pnpm install` downloads Electron and the ffmpeg binary for your OS. The repo pins `ffmpeg-static` to `5.2.0` (ffmpeg 6.0). Later versions ship a Linux build without the `drawtext` filter, and text overlays depend on it.

## Scripts

| Script            | What it does                                                 |
| ----------------- | ------------------------------------------------------------ |
| `pnpm dev`        | Starts the app with hot reload.                              |
| `pnpm typecheck`  | Type-checks the main and renderer projects.                  |
| `pnpm lint`       | Runs ESLint.                                                 |
| `pnpm test`       | Runs the vitest suite. The export test runs the real ffmpeg. |
| `pnpm build`      | Type-checks and bundles into `out/`.                         |
| `pnpm dist:linux` | Builds an AppImage into `release/`.                          |
| `pnpm dist:mac`   | Builds a dmg. Run it on macOS.                               |
| `pnpm dist:win`   | Builds an NSIS installer. Run it on Windows.                 |

Build each installer on its own OS. `ffmpeg-static` downloads only the binary for the OS it is installed on.

## Architecture

The data shape lives in `src/shared/project.ts`. A `Project` holds the probed source video, an ordered list of clips, and a list of overlays. Each clip is a range of the source in source seconds. Each overlay is either `text` or `image`, with a start and end in timeline seconds and a center position as a fraction of the frame. Every edit goes through `editProject`, a pure reducer, so the renderer state and the tests use the same code.

The main process (`src/main`) owns the file dialogs, ffprobe, and the export job. The renderer never sees file paths. Main gives each opened file an asset id and serves its bytes through the `media://<asset id>/` protocol. The preload script exposes a small typed API (`src/shared/api.ts`) through `contextBridge`. The window runs with context isolation and the sandbox on, and main validates every IPC payload with the zod schemas from `project.ts`.

Export turns the project into one ffmpeg command (`src/main/export-args.ts`). It trims each clip and concatenates them, then draws text with `drawtext` and composites images with `overlay`. Each overlay is gated with `enable='between(t,start,end)'`. `drawtext` uses the bundled `resources/fonts/NotoSans-SemiBold.ttf`, so text looks the same on every OS. ffmpeg reports progress on stdout through `-progress pipe:1`, and the export dialog shows it.

The preview plays the source `<video>` and maps the playhead from timeline time to source time with `locate`. At the end of a clip, it seeks to the start of the next one. Overlays render as DOM on top of the video in the same fractional coordinates the export uses. Text size scales with the frame height.

## License

MIT. Noto Sans is under the SIL Open Font License (`resources/fonts/OFL.txt`).
