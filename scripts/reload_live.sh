#!/bin/sh
set -eu

APP_PATH="/Applications/Ableton Live 12 Suite.app"
APP_NAME="Ableton Live 12 Suite"
SET_PATH="/Users/gsn8/Desktop/tek1 Project/test project.als"

SAVE_RESULT=$(/Users/gsn8/live-agent-cli/scripts/save_live_set.sh || true)
echo "$SAVE_RESULT"

osascript -e "tell application \"$APP_NAME\" to quit" || true
sleep 8
open -a "$APP_PATH" "$SET_PATH"
sleep 12
echo "reloaded $APP_NAME with $SET_PATH"
