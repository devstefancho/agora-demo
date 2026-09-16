#!/usr/bin/env bash
# 파트너 앱(iOS) 을 터미널에서만 다룬다. Xcode GUI 없이 생성·빌드·설치까지.
#
#   scripts/ios.sh doctor   준비 점검 (xcodegen, xcodebuild, 서명, 연결된 기기)
#   scripts/ios.sh gen      AppIdConfig.swift 생성 + xcodegen generate
#   scripts/ios.sh sim      시뮬레이터 빌드·설치·실행 (iPhone 시뮬레이터 하나를 고른다)
#   scripts/ios.sh device   실기기 빌드·설치·실행 (기기 고르기는 아래)
#
# 실기기 고르기: IOS_DEVICE 환경변수 → mobile/device.local 첫 줄(gitignore) → 연결된 첫 기기.
# 값은 기기 이름·Identifier·모델 중 하나의 일부면 된다. 예) echo "iPhone 15 Pro Max" > mobile/device.local
#   scripts/ios.sh build    실기기용 빌드만 (서명 포함)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS="$ROOT/mobile"
SCHEME="Partner"
BUNDLE="com.devstefancho.partner"
DERIVED="$IOS/.derived"

usage() { sed -n '2,12p' "$0"; }

app_id_from_env() {
  # 웹앱 web/.env.local 의 NEXT_PUBLIC_AGORA_APP_ID. 값은 출력하지 않는다.
  local f="$ROOT/web/.env.local"
  [ -f "$f" ] || return 1
  sed -n 's/^NEXT_PUBLIC_AGORA_APP_ID=//p' "$f" | tr -d '"' | tr -d "'" | head -1
}

cmd_doctor() {
  local fail=0
  if command -v xcodegen >/dev/null; then echo "✓ xcodegen $(xcodegen --version | head -1)"; else echo "✗ xcodegen 없음 → brew install xcodegen"; fail=1; fi
  if command -v xcodebuild >/dev/null; then echo "✓ $(xcodebuild -version | head -1)"; else echo "✗ xcodebuild 없음 → Xcode 설치"; fail=1; fi
  if [ -f "$IOS/Signing.xcconfig" ] && grep -q 'DEVELOPMENT_TEAM *= *[A-Z0-9]' "$IOS/Signing.xcconfig"; then echo "✓ Signing.xcconfig (Team ID 있음)"; else echo "△ Signing.xcconfig 없음/비어 있음 → 시뮬레이터는 되고 실기기는 안 됨. Signing.xcconfig.example 참고"; fi
  if app_id_from_env >/dev/null 2>&1 && [ -n "$(app_id_from_env)" ]; then echo "✓ App ID (웹앱 env 에서 읽음)"; else echo "✗ web/.env.local 에 NEXT_PUBLIC_AGORA_APP_ID 없음 → web/ 에서 agora project env write --template nextjs"; fail=1; fi
  local devices
  devices="$(xcrun devicectl list devices 2>/dev/null | grep -Ei 'iphone|ipad' | grep -vi 'simulator' || true)"
  if [ -n "$devices" ]; then echo "✓ 연결된 기기:"; echo "$devices" | sed 's/^/    /'; else echo "△ 연결된 실기기 없음 (시뮬레이터는 가능)"; fi
  local want; want="$(wanted_device)"
  if [ -n "$want" ]; then echo "✓ 실기기 기본: $want (IOS_DEVICE 또는 mobile/device.local)"; else echo "△ 실기기 기본 없음 → 연결된 첫 기기에 설치. 고르려면 mobile/device.local 에 기기 이름"; fi
  [ "$fail" -eq 0 ] && echo && echo "준비 끝. scripts/ios.sh gen 으로 프로젝트를 만드세요." || { echo; echo "위 ✗ 를 먼저 해결하세요."; exit 1; }
}

cmd_gen() {
  local id
  id="$(app_id_from_env || true)"
  [ -n "$id" ] || { echo "web/.env.local 에 NEXT_PUBLIC_AGORA_APP_ID 가 없어요."; exit 1; }
  printf 'enum AppIdConfig {\n    static let value = "%s"\n}\n' "$id" > "$IOS/Partner/AppIdConfig.swift"
  [ -f "$IOS/Signing.xcconfig" ] || cp "$IOS/Signing.xcconfig.example" "$IOS/Signing.xcconfig"
  (cd "$IOS" && xcodegen generate)
  echo "생성 완료: $IOS/$SCHEME.xcodeproj"
}

first_simulator() {
  xcrun simctl list devices available | grep -E 'iPhone' | head -1 | sed -E 's/.*\(([0-9A-F-]{36})\).*/\1/'
}

cmd_sim() {
  local udid; udid="$(first_simulator)"
  [ -n "$udid" ] || { echo "사용 가능한 iPhone 시뮬레이터가 없어요."; exit 1; }
  xcrun simctl boot "$udid" 2>/dev/null || true
  open -a Simulator
  # 시뮬레이터도 ad-hoc 서명은 필요하다. CODE_SIGNING_ALLOWED=NO 로 끄면 임베드된 Agora 프레임워크가
  # 서명 없이 들어가 dyld 가 "Library not loaded" 로 앱을 죽인다 (2026-09-09 실측).
  xcodebuild -project "$IOS/$SCHEME.xcodeproj" -scheme "$SCHEME" -configuration Debug \
    -destination "id=$udid" -derivedDataPath "$DERIVED" build | tail -3
  local app="$DERIVED/Build/Products/Debug-iphonesimulator/$SCHEME.app"
  xcrun simctl install "$udid" "$app"
  xcrun simctl launch "$udid" "$BUNDLE"
  echo "시뮬레이터에서 실행 중 ($udid)"
}

wanted_device() {
  if [ -n "${IOS_DEVICE:-}" ]; then echo "$IOS_DEVICE"; return; fi
  [ -f "$IOS/device.local" ] && head -1 "$IOS/device.local" | tr -d '\r' || true
}

# 연결돼 쓸 수 있는(available) iPhone 줄 가운데 고른 기기의 Identifier(UUID). 이름에 공백이 있어도 UUID 로 뽑는다.
first_device() {
  local lines want line
  lines="$(xcrun devicectl list devices 2>/dev/null | grep -Ei 'iphone' | grep -vi simulator | grep -i 'available' | grep -vi 'unavailable' || true)"
  want="$(wanted_device)"
  if [ -n "$want" ]; then
    line="$(printf '%s\n' "$lines" | grep -iF -- "$want" | head -1 || true)"
    [ -n "$line" ] || { echo "지정한 기기($want)가 연결돼 있지 않아요." >&2; return 1; }
  else
    line="$(printf '%s\n' "$lines" | head -1)"
  fi
  printf '%s\n' "$line" | grep -Eo '[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}' | head -1
}

cmd_build() {
  # -allowProvisioningUpdates 는 Xcode 에 Apple ID 가 로그인돼 있어야 동작한다("No Accounts" 로 실패).
  # 이 맥에 Xcode 관리 와일드카드 프로파일(팀.*)이 이미 있으면 그 플래그 없이 자동 서명이 통과한다 (2026-09-09·09-14 실측).
  # Team ID 는 인증서 이름의 괄호 값이 아니라 프로파일의 TeamIdentifier 다. 프로파일이 하나도 없으면 Xcode 에 한 번 로그인해 만든다.
  xcodebuild -project "$IOS/$SCHEME.xcodeproj" -scheme "$SCHEME" -configuration Debug \
    -destination "generic/platform=iOS" -derivedDataPath "$DERIVED" build | tail -3
}

cmd_device() {
  local dev; dev="$(first_device)" || exit 1
  [ -n "$dev" ] || { echo "연결된 iPhone 이 없어요. USB 연결 후 신뢰하거나 무선 디버깅을 켜세요."; exit 1; }
  cmd_build
  local app="$DERIVED/Build/Products/Debug-iphoneos/$SCHEME.app"
  xcrun devicectl device install app --device "$dev" "$app"
  xcrun devicectl device process launch --device "$dev" "$BUNDLE"
  echo "기기에서 실행 중 ($dev)"
}

case "${1:-}" in
  doctor) cmd_doctor ;;
  gen) cmd_gen ;;
  sim) cmd_sim ;;
  build) cmd_build ;;
  device) cmd_device ;;
  -h|--help|"") usage ;;
  *) echo "모르는 명령: $1"; usage; exit 2 ;;
esac
