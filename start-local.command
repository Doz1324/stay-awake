#!/bin/zsh
# Double-click on macOS, or run: zsh ./start-local.command
set -eu
cd -- "${0:A:h}"
if command -v node >/dev/null 2>&1; then
  awake_node="$(command -v node)"
elif [[ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]]; then
  awake_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
else
  print '请先安装 Node.js 24 LTS，再运行 npm install 和 npm run build。'
  read -k 1 '?按任意键关闭。'
  exit 1
fi
if [[ ! -f node_modules/vite/bin/vite.js || ! -f dist/index.html ]]; then
  print '缺少依赖或构建文件。请先运行 npm install，再运行 npm run build。'
  read -k 1 '?按任意键关闭。'
  exit 1
fi
print 'Stay Awake: http://127.0.0.1:4173'
print '请保持此窗口运行；按 Ctrl+C 停止。离线缓存就绪后可在同一浏览器离线打开。'
exec "$awake_node" node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort
