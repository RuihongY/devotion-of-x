#!/bin/sh
# 全量回归:在仓库根目录起本地静态服务后运行
#   (cd 仓库根 && python3 -m http.server 8461 &) 然后 sh genius-club/tests/run.sh
# 依赖:全局 playwright(NODE_PATH 指向全局 node_modules)+ 预装 chromium。
cd "$(dirname "$0")" || exit 1
: "${NODE_PATH:=/opt/node22/lib/node_modules}"
export NODE_PATH
fail=0
for t in smoke e2e e3 e1 fix ch2 en fix2 fxsmoke; do
  printf "%s: " "$t"
  if node "$t.js" >/dev/null 2>&1; then echo PASS; else echo FAIL; fail=1; fi
done
exit $fail
