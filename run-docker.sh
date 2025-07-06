#!/bin/sh

set -e

HOST_PORT=4000

TOP_DIR="$(cd "$(dirname "$0")"; pwd -P)"

# Hard-code this to 4.2.0, as latest doesn't have webrick installed, and fails
# https://github.com/github/pages-gem/issues/752
JEKYLL_VERSION=4.2.0

exec docker run \
	--rm \
	-ti \
	--volume="$TOP_DIR:/srv/jekyll:Z" \
	--publish [::1]:$HOST_PORT:4000 \
	jekyll/jekyll:$JEKYLL_VERSION \
	jekyll serve --incremental

