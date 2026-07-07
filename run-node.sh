#!/bin/sh

set -ex

HOST_PORT=4000
BACKEND_PORT=4321

TOP_DIR="$(cd "$(dirname "$0")"; pwd -P)"

# Hard-code this to 4.2.0, as latest doesn't have webrick installed, and fails
# https://github.com/github/pages-gem/issues/752
NODE_VERSION=24

term_args=""
if [ -t 0 ]; then term_args="-t"; fi
if [ $# -eq 0 ]; then set -- npm run install+dev -- --host; fi
exec docker run \
	--rm \
	-i $term_args \
	--volume="$TOP_DIR:/srv/node:Z" \
	--workdir "/srv/node" \
	--publish [::1]:$HOST_PORT:$BACKEND_PORT \
	node:$NODE_VERSION \
	"$@"

