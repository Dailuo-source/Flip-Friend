#!/bin/sh
# web/index.html is built from the parts in src/. Edit those, then run: sh build.sh
cd "$(dirname "$0")" && cat src/1-head.html src/2-core.js src/3-views.js src/3b-desktop.js src/4-actions.js > web/index.html
