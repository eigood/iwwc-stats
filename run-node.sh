#!/bin/sh

set -e

HOST_PORT=4000

TOP_DIR="$(cd "$(dirname "$0")"; pwd -P)"

# Hard-code this to 4.2.0, as latest doesn't have webrick installed, and fails
# https://github.com/github/pages-gem/issues/752
NODE_VERSION=22

if [ $# -eq 0 ]; then set -- npm run install+dev -- --host; fi
exec docker run \
	--rm \
	-ti \
	--volume="$TOP_DIR:/srv/node:Z" \
	--publish [::1]:$HOST_PORT:4000 \
	node:$NODE_VERSION \
	"$@"

