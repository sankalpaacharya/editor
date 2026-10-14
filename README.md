<p align="center">
  <img src="assets/logo.svg" width="112" alt="Editor logo" />
</p>

<h1 align="center">Editor</h1>

<p align="center"><strong>A small desktop video editor. Cut, trim, add a title, export.</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Runs on Windows, macOS, and Linux" />
  <img src="https://img.shields.io/badge/Electron-39-47848f" alt="Built on Electron 39" />
</p>

<p align="center">
  <img src="assets/showcase.png" width="1000" alt="Editor with two videos on the timeline, a title and an image overlay, and the image selected in the inspector" />
</p>

Create a project, import videos and images, cut them together, and export an MP4. Projects live in a local SQLite database, so your edits are there the next time you open the app.

## Install

Download the installer for your OS from [Releases](https://github.com/sankalpaacharya/editor/releases): an `.exe` for Windows, a `.dmg` for macOS, or an `.AppImage` for Linux. To get a newer version later, choose **Help > Check for Updates…**.

## What you get

- A Projects page with a frame from each project as its thumbnail
- A media panel per project: import or drop videos and images, then add them to the timeline
- Cut several videos together. Each source is fitted into the project's frame size
- Split at the playhead, trim clip edges, delete clips, and drag clips to reorder them
- Set each clip's speed (0.25x to 4x) and volume, or mute it
- Add text overlays (Title, Subtitle, Caption) and PNG, JPG, or WebP image overlays, then drag them in the preview
- A timeline with frame thumbnails, the audio waveform, and overlay chips
- Undo and redo for every edit
- Export to MP4 with a progress bar and **Cancel**, with a history of each project's exports

| Key                           | Action                         |
| ----------------------------- | ------------------------------ |
| **Space**                     | Play or pause                  |
| **X**                         | Cut at the playhead            |
| **Delete**                    | Delete the selection           |
| **Ctrl+Z** / **Ctrl+Shift+Z** | Undo / redo (**Cmd** on macOS) |
| **Left** / **Right**          | Step one frame                 |
| **Home** / **End**            | Jump to the start or end       |

The preview and the export use the same coordinates, so an overlay lands where you placed it. Text uses the bundled Noto Sans on every OS.

## Dev

You need Node.js 22 and pnpm 10.

```sh
pnpm install
pnpm dev
```

| Script            | What it does                                                 |
| ----------------- | ------------------------------------------------------------ |
| `pnpm dev`        | Starts the app with hot reload.                              |
| `pnpm typecheck`  | Type-checks the main and renderer projects.                  |
| `pnpm lint`       | Runs oxlint.                                                 |
| `pnpm test`       | Runs the vitest suite. The export test runs the real ffmpeg. |
| `pnpm build`      | Type-checks and bundles into `out/`.                         |
| `pnpm dist:linux` | Builds an AppImage into `release/`.                          |
| `pnpm dist:mac`   | Builds a dmg and a zip. Run it on macOS.                     |
| `pnpm dist:win`   | Builds an NSIS installer. Run it on Windows.                 |

Build each installer on its own OS, because `ffmpeg-static` downloads only the binary for the OS it is installed on. The repo pins `ffmpeg-static` to `5.2.0` (ffmpeg 6.0). Later versions ship a Linux build without the `drawtext` filter, and text overlays depend on it.

## Release

Push a tag that starts with `v`, for example `v0.2.0`, after you bump `version` in `package.json`. The `Release` workflow builds the installers on Linux, macOS, and Windows and uploads them to a draft GitHub release. Publish the draft, and installed apps find the update through **Check for Updates…**.

The update check reads public GitHub releases. If the repository is private, installed apps can't see new versions. macOS installs updates only when the app is signed.

## Architecture

The data shape lives in `src/shared/sequence.ts`. A project's `Sequence` holds an output format, an ordered list of clips, and a list of overlays. Each clip is a range of one video media item in source seconds, with a speed and a volume. Each overlay is either `text` or `image`, with a start and end in timeline seconds and a center position as a fraction of the frame. Every edit goes through `editSequence`, a pure reducer. The renderer wraps it in an undo history that merges a continuous drag into one step.

The main process (`src/main`) owns the database, the file dialogs, ffprobe, and the export job. The database is a SQLite file (`editor.db` in the app's user data folder) opened with Node's built-in `node:sqlite`, so there is no native module to rebuild. It has three tables: `projects` (name and sequence), `media` (the files imported into each project), and `exports`. The renderer never sees file paths. It refers to media by id, and the `media://<id>/` protocol serves the file, a thumbnail, a filmstrip, and a waveform. ffmpeg generates those images on first request and main caches them. The preload script exposes a small typed API (`src/shared/api.ts`) through `contextBridge`. The window runs with context isolation and the sandbox on, and main validates every IPC payload with zod.

Export turns the sequence into one ffmpeg command (`src/main/export-args.ts`). It trims each clip, retimes it with `setpts` and `atempo`, fits it into the output format, sets its volume, and concatenates the clips. Then it draws text with `drawtext` and composites images with `overlay`, each gated with `enable='between(t,start,end)'`. ffmpeg reports progress through `-progress pipe:1`.

The preview keeps one `<video>` per source and maps the playhead to a clip and a source time with `locate`. At a clip boundary it hands off to the next source and sets that clip's speed and volume.

## License

MIT. Noto Sans is under the SIL Open Font License (`resources/fonts/OFL.txt`).
