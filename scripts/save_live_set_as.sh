#!/bin/sh
set -eu
TARGET_PATH="$1"
osascript /Users/gsn8/live-agent-cli/scripts/save_live_set_as.applescript "$TARGET_PATH"
