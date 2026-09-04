# Taskboard

Taskboard is a local-first issue board with a browser UI, HTTP API, and `taskctl` CLI for moving work from plan to completion.

## Run locally

```sh
npm install
npm run build
npm start
```

Open `http://127.0.0.1:47823` after the server starts.

## `taskctl` examples

```sh
taskctl project list --json
taskctl issue create --project local --title "Ship the change" --json
taskctl issue list --project local --json
```

Run `npm link` if you want `taskctl` available directly on your shell path.

## Notes

- `TASKBOARD_HOST` controls the HTTP bind address; use `127.0.0.1` for loopback-only access or `0.0.0.0` for trusted LAN access.
- `TASKBOARD_THREAD_ID` supplies conversation attribution for `taskctl` issue and comment writes when `--thread-id` is omitted.

Upstream: [chuspeeism/dashi-taskboard](https://github.com/chuspeeism/dashi-taskboard).

Licensed under the MIT License.
