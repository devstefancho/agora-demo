#!/usr/bin/env node
// 통합 결과 기계 검증. 모델이 "됐다"고 말하기 전에 스스로 돌리는 체크리스트.
// 실제 영상·음성 왕복은 사람이 확인한다. 이 스크립트는 그 전 단계의 실수만 잡는다. 가짜 미디어는 쓰지 않는다.
//
// video-call-web-mobile/ 에서 실행한다. 웹 검사는 web/, 폰 앱 검사는 mobile/ 기준이다.
//
//   node scripts/check-integration.mjs call     # 파트너 통화 (lib/agora/rtc.ts + rtm.ts + token route)
//   node scripts/check-integration.mjs ios      # 후반부 B, 폰 앱 파트너 (PartnerSession.swift)

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// video-call-web-mobile/. 어디서 실행하든 web/·mobile/ 을 여기서 찾는다.
const EPISODE = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SHELL_MARK = "껍데기: 통합 단계가 이 파일을 채운다.";
const ROUTE_SHELL = "아직 껍데기";
const TOKEN_ROUTE = "app/api/agora/token/route.ts";
const CLIENT_SDKS = ["agora-rtc-sdk-ng", "agora-rtm"];
const SERVER_SDKS = ["agora-token"];
// import 격리 검사에서 훑지 않는 디렉토리 (소스가 아니거나 다른 규칙이 있는 곳)
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "public"]);

// 통합이 바꾸면 안 되는 곳. 화면, 콘텐츠, 계약 파일, 절차서. (.claude/settings*.json 은 권한 승인이 건드리므로 보지 않는다)
const FROZEN = [
  "components/",
  "content/",
  "app/page.tsx",
  "app/layout.tsx",
  "app/globals.css",
  "lib/call.ts",
  "lib/storage.ts",
  "lib/speech.ts",
  // web/ 밖의 스크립트·문서
  "../scripts/",
  "../docs/",
];

const MODES = {
  call: {
    shells: ["lib/agora/rtc.ts", "lib/agora/rtm.ts"],
    routes: { [TOKEN_ROUTE]: ["GET"] },
    needles: {
      "lib/agora/rtc.ts": ["export function createRtcCall", "setMic", "setCamera", "stop(", "joinStateChannel"],
      "lib/agora/rtm.ts": ["export async function joinStateChannel", "presence", "setState"],
      [TOKEN_ROUTE]: ["buildTokenWithRtm"],
    },
    human: "데스크톱과 폰으로 실제 통화하고, 한쪽 마이크를 껐을 때 상대 이름표가 바뀌는지 보세요.",
  },
};

const modeName = process.argv[2];
if (modeName === "ios") {
  process.chdir(join(EPISODE, "mobile"));
  checkIos();
} else if (MODES[modeName]) {
  process.chdir(join(EPISODE, "web"));
  checkWeb(modeName, MODES[modeName]);
} else {
  console.error("사용법: node scripts/check-integration.mjs call|ios");
  process.exit(2);
}

function checkWeb(name, mode) {
  const results = [];
  const pass = (label, detail = "") => results.push({ ok: true, label, detail });
  const fail = (label, detail) => results.push({ ok: false, label, detail });

  // a. 화면 코드 보존: 바뀌면 안 되는 파일이 바뀌지 않았나
  const frozen = FROZEN;
  const changed = changedFiles(fail);
  const touched = changed.filter((f) => frozen.some((p) => f === p || f.startsWith(p)));
  if (touched.length) fail("화면 코드 보존", `바뀌면 안 되는 파일: ${touched.join(", ")}`);
  else pass("화면 코드 보존", "components·content·계약 파일 그대로");

  // b. SDK import 격리: 클라이언트 SDK 는 lib/agora/ 안, 서버 SDK 는 app/api/agora/ 안
  const leaks = [];
  for (const file of sourceFiles(".")) {
    const src = readFileSync(file, "utf8");
    for (const pkg of agoraImports(src)) {
      const okPlace = CLIENT_SDKS.includes(pkg)
        ? file.startsWith("lib/agora/")
        : SERVER_SDKS.includes(pkg)
          ? file.startsWith("app/api/agora/")
          : false;
      if (!okPlace) leaks.push(`${file} → ${pkg}`);
    }
  }
  if (leaks.length) fail("SDK import 격리", leaks.join("; "));
  else pass("SDK import 격리", "클라이언트 SDK 는 lib/agora/, 서버 SDK 는 app/api/agora/ 안에만");

  // c. 껍데기 줄 소멸
  for (const file of mode.shells) {
    if (!existsSync(file)) fail(file, "파일이 없어요");
    else if (readFileSync(file, "utf8").includes(SHELL_MARK)) fail(file, "아직 껍데기예요 (표식 주석이 남아 있어요)");
    else pass(file, "껍데기 표식 없음");
  }

  // d. route 존재·메서드
  for (const [file, methods] of Object.entries(mode.routes)) {
    if (!existsSync(file)) {
      fail(file, "route 파일이 없어요");
      continue;
    }
    const src = readFileSync(file, "utf8");
    const missing = methods.filter((m) => !new RegExp(`export\\s+(async\\s+)?(function|const)\\s+${m}\\b`).test(src));
    if (missing.length) fail(file, `${missing.join("·")} 가 없어요`);
    else if (src.includes(ROUTE_SHELL)) fail(file, "아직 껍데기예요 (501)");
    else pass(file, `${methods.join("·")} 있음`);
  }

  // 인터페이스·필수 문자열 (아직 껍데기인 파일은 위에서 이미 실패로 잡았으니 건너뛴다)
  for (const [file, needles] of Object.entries(mode.needles)) {
    if (!existsSync(file)) continue;
    const src = readFileSync(file, "utf8");
    if (src.includes(SHELL_MARK)) continue;
    for (const needle of needles) {
      if (!src.includes(needle)) fail(`${file} 인터페이스`, `${needle} 가 없어요`);
    }
  }

  // e. 시크릿 격리
  const clientFiles = [...sourceFiles("lib"), ...sourceFiles("components")];
  const leaked = clientFiles.filter((f) => {
    const src = readFileSync(f, "utf8");
    return /APP_CERTIFICATE/.test(src) || /\b[0-9a-f]{32}\b/.test(src);
  });
  if (leaked.length) fail("시크릿 격리", `클라이언트 코드에 Certificate 참조나 32자 hex: ${leaked.join(", ")}`);
  else pass("시크릿 격리", "lib·components 에 Certificate 없음");

  // f. 린트·빌드
  try {
    execFileSync("pnpm", ["lint"], { stdio: "ignore" });
    pass("pnpm lint", "통과");
  } catch {
    fail("pnpm lint", "실패. `pnpm lint` 를 직접 실행해 오류를 보세요");
  }
  try {
    execFileSync("pnpm", ["build"], { stdio: "ignore" });
    pass("pnpm build", "통과");
  } catch {
    fail("pnpm build", "실패. `pnpm build` 를 직접 실행해 오류를 보세요");
  }

  report(results, mode.human);
}

// iOS 파트너 앱: PartnerSession.swift 가 껍데기가 아닌지, 화면 파일이 그대로인지, 시뮬레이터 빌드가 되는지.
function checkIos() {
  const results = [];
  const pass = (label, detail = "") => results.push({ ok: true, label, detail });
  const fail = (label, detail) => results.push({ ok: false, label, detail });
  const frozen = ["Partner/ContentView.swift", "Partner/Theme.swift", "Partner/PartnerApp.swift"];
  const changed = changedFiles(fail);
  const touched = changed.filter((f) => frozen.includes(f));
  if (touched.length) fail("화면 코드 보존", `바뀌면 안 되는 파일: ${touched.join(", ")}`);
  else pass("화면 코드 보존", "ContentView·Theme·App 그대로");
  const seamPath = "Partner/PartnerSession.swift";
  const seam = readFileSync(seamPath, "utf8");
  if (seam.includes("status = .unavailable")) fail(seamPath, "아직 껍데기 구현이에요 (unavailable)");
  else pass(seamPath, "껍데기 문구 없음");
  if (!seam.includes("import AgoraRtcKit")) fail(seamPath, "AgoraRtcKit 을 import 하지 않아요");
  if (!seam.includes("import AgoraRtmKit")) fail(seamPath, "AgoraRtmKit 을 import 하지 않아요 (상대 마이크·카메라 상태는 RTM)");
  if (!seam.includes("/api/agora/token")) fail(seamPath, "토큰을 /api/agora/token 에서 받지 않아요");
  if (!seam.includes("rtm=1")) fail(seamPath, "토큰을 rtm=1 로 받지 않아요 (RTC+RTM 통합 토큰)");
  for (const needle of ["func join(code:", "func setMic", "func setCamera", "func leave", "partnerMicOn", "partnerCameraOn"]) {
    if (!seam.includes(needle)) fail("PartnerSession 인터페이스", `${needle} 가 사라졌어요`);
  }
  if (/\b[0-9a-f]{32}\b/.test(seam)) fail("시크릿 격리", "PartnerSession.swift 에 32자 hex 가 있어요 (App ID 하드코딩?)");
  else pass("시크릿 격리", "하드코딩된 ID 없음");
  try {
    execFileSync(
      "xcodebuild",
      ["-project", "Partner.xcodeproj", "-scheme", "Partner", "-configuration", "Debug", "-destination", "generic/platform=iOS Simulator", "-derivedDataPath", ".derived", "build"],
      { stdio: "ignore" },
    );
    pass("시뮬레이터 빌드", "통과");
  } catch {
    fail("시뮬레이터 빌드", "실패. scripts/ios.sh gen 후 xcodebuild 를 직접 실행해 오류를 보세요");
  }
  report(results, "폰과 데스크톱으로 실제 통화해 보세요.");
}

function report(results, human) {
  for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.label.padEnd(34)} ${r.detail}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? `\n${failed}개 남았어요. 아직 "된다"고 말하지 마세요.` : `\n기계 검증 통과. 이제 사람이 확인할 차례예요. ${human}`);
  process.exit(failed ? 1 : 0);
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

// 지금 디렉토리(web/ 또는 mobile/) 기준 상대 경로. web/ 밖의 스크립트·문서는 "../" 로 나온다.
function changedFiles(fail) {
  try {
    const diff = git(["diff", "--name-only", "--relative", "HEAD"]).split("\n").filter(Boolean);
    const untracked = git(["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean);
    const episode = ["scripts", "docs"].flatMap((d) =>
      git(["diff", "--name-only", "--relative", "HEAD", "--", `../${d}`]).split("\n").filter(Boolean).map((f) => `../${d}/${f}`),
    );
    return [...diff, ...untracked, ...episode];
  } catch {
    fail("git", "git 상태를 읽지 못했어요");
    return [];
  }
}

function sourceFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = dir === "." ? d.name : join(dir, d.name);
    if (d.isDirectory()) return SKIP_DIRS.has(d.name) ? [] : sourceFiles(p);
    return /\.(ts|tsx|mjs|js)$/.test(d.name) ? [p] : [];
  });
}

function agoraImports(src) {
  const found = new Set();
  const re = /(?:from\s*|import\s*\(\s*|require\s*\(\s*)["']((?:@agora[\w-]*\/|agora-)[^"']*)["']/g;
  for (const m of src.matchAll(re)) {
    const spec = m[1];
    found.add(spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]);
  }
  return [...found];
}
