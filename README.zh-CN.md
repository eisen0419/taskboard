# Taskboard

Taskboard 是一个本地优先的议题面板，提供浏览器界面、HTTP API 和 `taskctl` CLI，帮助工作从计划推进到完成。

## 本地运行

```sh
npm install
npm run build
npm start
```

服务启动后打开 `http://127.0.0.1:47823`。

## `taskctl` 示例

```sh
taskctl project list --json
taskctl issue create --project local --title "交付改动" --json
taskctl issue list --project local --json
```

如需直接在 shell 中使用 `taskctl`，请运行 `npm link`。

## 注意事项

- `TASKBOARD_HOST` 控制 HTTP 绑定地址；使用 `127.0.0.1` 仅允许本机访问，使用 `0.0.0.0` 可供受信任的局域网访问。
- `taskctl` 写入议题或评论时，如未传入 `--thread-id`，可通过 `TASKBOARD_THREAD_ID` 提供会话归属。

上游项目：[chuspeeism/dashi-taskboard](https://github.com/chuspeeism/dashi-taskboard)。

本项目采用 MIT License。
