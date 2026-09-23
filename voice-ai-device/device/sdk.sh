#!/bin/sh
# Agora IoT SDK(RTSA Lite 1.9.7, 리눅스 C)를 받아 sdk/ 에 둔다.
# sdk/include, sdk/lib 과 참고용 예제(sdk/example/hello_rtsa.c)만 남긴다.
# 사용법: ./sdk.sh [x86_64|aarch64]   (생략하면 uname -m)
set -eu
cd "$(dirname "$0")"

arch="${1:-$(uname -m)}"
case "$arch" in
  x86_64) pkg=x86_64-linux-gnu ;;
  aarch64 | arm64) pkg=aarch64-linux-gnu ;;
  *) echo "지원하지 않는 아키텍처예요: $arch (x86_64 | aarch64)" >&2; exit 1 ;;
esac

if [ -f sdk/lib/libagora-rtc-sdk.so ]; then
  echo "SDK 가 이미 있어요 (sdk/)"
  exit 0
fi

url="https://download.agora.io/rtsasdk/release/Agora-RTSALite-RmRdRcAcAjCF-${pkg}-v1.9.7-20251127_103054-992914.tgz"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "받는 중: $pkg"
curl -fsSL -o "$tmp/sdk.tgz" "$url"
tar xzf "$tmp/sdk.tgz" -C "$tmp"

mkdir -p sdk/include sdk/lib sdk/example
cp "$tmp"/agora_rtsa_sdk/agora_sdk/include/*.h sdk/include/
cp "$tmp"/agora_rtsa_sdk/agora_sdk/lib/*/libagora-rtc-sdk.so sdk/lib/
cp "$tmp"/agora_rtsa_sdk/example/hello_rtsa/hello_rtsa.c sdk/example/
echo "SDK 준비 끝: sdk/ ($pkg)"
