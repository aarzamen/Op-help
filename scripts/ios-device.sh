#!/usr/bin/env bash
# Build the iOS app and install it on a connected iPhone or iPad.
#
#   scripts/ios-device.sh            # first available iPhone
#   OPORD_DEVICE=<name or id> scripts/ios-device.sh
#
# Needs Xcode, a development certificate, and a provisioning profile that covers
# com.aarzamen.opord on that device (a team wildcard profile does). The Apple team ID
# comes from $OPORD_TEAM_ID or the gitignored file ios/signing.local (one line:
# OPORD_TEAM_ID=XXXXXXXXXX), so no team or device identifier lives in the repo.
# The script never changes the Apple account (no -allowProvisioningUpdates).
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -z "${OPORD_TEAM_ID:-}" && -f ios/signing.local ]]; then
  # shellcheck disable=SC1091
  source ios/signing.local
fi
if [[ -z "${OPORD_TEAM_ID:-}" ]]; then
  echo "Set OPORD_TEAM_ID (your Apple team ID) or put OPORD_TEAM_ID=... in ios/signing.local" >&2
  exit 1
fi

# The device: the one named in $OPORD_DEVICE, else the first connected iPhone.
devices_json=$(mktemp)
trap 'rm -f "$devices_json"' EXIT
xcrun devicectl list devices --json-output "$devices_json" >/dev/null
PICK_DEVICE='
import json, sys
devices = json.load(open(sys.argv[1]))["result"]["devices"]
want = sys.argv[2]
for d in devices:
    hw, props = d.get("hardwareProperties", {}), d.get("deviceProperties", {})
    ids = {d.get("identifier"), hw.get("udid"), props.get("name")}
    ok = (want in ids) if want else (hw.get("deviceType") == "iPhone")
    if ok and d.get("connectionProperties", {}).get("tunnelState") != "unavailable":
        print(d["identifier"], hw.get("udid"), props.get("name", "device").replace(" ", "_"))
        break
'
DEVICE_LINE=$(python3 -c "$PICK_DEVICE" "$devices_json" "${OPORD_DEVICE:-}")
read -r DEVICE_ID DEVICE_UDID DEVICE_NAME <<<"$DEVICE_LINE"
if [[ -z "${DEVICE_ID:-}" ]]; then
  echo "No connected iPhone found${OPORD_DEVICE:+ matching $OPORD_DEVICE}. Unlock it and plug it in." >&2
  exit 1
fi

VERSION=$(node -p "require('./package.json').version")
BUILD=$(date -u +%Y%m%d%H%M)
echo "Building OPORD $VERSION ($BUILD) for $DEVICE_NAME"

npm run build
npx cap sync ios

xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination "id=$DEVICE_UDID" \
  -derivedDataPath ios/DerivedData \
  DEVELOPMENT_TEAM="$OPORD_TEAM_ID" \
  CODE_SIGN_STYLE=Automatic \
  MARKETING_VERSION="$VERSION" \
  CURRENT_PROJECT_VERSION="$BUILD" \
  -quiet build

APP=ios/DerivedData/Build/Products/Release-iphoneos/App.app
xcrun devicectl device install app --device "$DEVICE_ID" "$APP"
xcrun devicectl device process launch --device "$DEVICE_ID" com.aarzamen.opord
echo "Installed and launched OPORD $VERSION ($BUILD) on $DEVICE_NAME"
