#!/usr/bin/env node
// 통합 결과 기계 검증. 모델이 "됐다"고 말하기 전에 스스로 돌리는 체크리스트.
// 실제 목소리·얼굴은 사람이 확인한다. 이 스크립트는 그 전 단계의 실수만 잡는다. 가짜 미디어는 쓰지 않는다.
//
// avatar-ai-web/ 에서 실행한다.
//
//   node scripts/check-integration.mjs avatar   # AI 아바타 대화 (lib/agora/convoai.ts + token·agent route)

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// avatar-ai-web/. 어디서 실행하든 여기를 기준으로 본다.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SHELL_MARK = "껍데기: 통합 단계가 이 파일을 채운다.";
const ROUTE_SHELL = "아직 껍데기";
const TOKEN_ROUTE = "app/api/agora/token/route.ts";
const AGENT_ROUTE = "app/api/agora/agent/route.ts";
const CLIENT = "lib/agora/convoai.ts";
// 서버 SDK 는 app/api/agora/ 안, 그 밖의 agora 패키지(클라이언트 SDK)는 lib/agora/ 안에만 있어야 한다.
const SERVER_SDKS = ["agora-token", "agora-agents"];
// import 격리 검사에서 훑지 않는 디렉토리 (소스가 아니거나 다른 규칙이 있는 곳)
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", ".claude", "public", "scripts", "docs"]);

// 통합이 바꾸면 안 되는 곳. 화면, 콘텐츠, 계약 파일, 절차서. (.claude/settings*.json 은 권한 승인이 건드리므로 보지 않는다)
const FROZEN = [
  "components/",
  "content/",
  "app/page.tsx",
  "app/layout.tsx",
  "app/globals.css",
  "lib/talk.ts",
  "lib/storage.ts",
  "lib/speech.ts",
  // 스크립트·문서
  "scripts/",
  "docs/",
];

const MODES = {
  avatar: {
    shells: [CLIENT, TOKEN_ROUTE, AGENT_ROUTE],
    routes: { [TOKEN_ROUTE]: ["GET"], [AGENT_ROUTE]: ["POST", "DELETE"] },
    needles: {
      [CLIENT]: ["export function createConvoAiTalk", "user-published", "onAvatar", "setMic", "/api/agora/agent"],
      [TOKEN_ROUTE]: ["buildTokenWithRtm"],
      [AGENT_ROUTE]: ["withAvatar", "buildMiaInstructions", "AVATAR_VENDOR"],
    },
    human: "Mia와 실제로 말해 보고, 얼굴이 무대에 뜨고 입 모양이 목소리와 맞는지 보세요.",
  },
};

const modeName = process.argv[2];
if (MODES[modeName]) {
  process.chdir(ROOT);
  checkWeb(modeName, MODES[modeName]);
} else {
  console.error("사용법: node scripts/check-integration.mjs avatar");
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
      const okPlace = SERVER_SDKS.includes(pkg) ? file.startsWith("app/api/agora/") : file.startsWith("lib/agora/");
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

  // 아바타 함정: 아바타 uid 가 에이전트 입력으로 되돌아오지 않게, 벤더가 요구하는 TTS 샘플레이트
  if (existsSync(AGENT_ROUTE)) {
    const src = readFileSync(AGENT_ROUTE, "utf8");
    if (!src.includes(SHELL_MARK)) {
      if (/remote_?[Rr]tc_?[Uu]ids\s*:\s*\[\s*["']\*["']|remoteUids\s*:\s*\[\s*["']\*["']/.test(src)) {
        fail("아바타 함정", "remoteUids 에 \"*\" 가 있어요. 학습자 uid 하나만 넣으세요");
      } else pass("아바타 함정", "remoteUids 에 \"*\" 없음");
      if (src.includes("LiveAvatarAvatar") && !/OpenAITTS|24000/.test(src)) {
        fail("TTS 샘플레이트", "LiveAvatar 는 24kHz TTS 가 필요해요 (Agora 관리 OpenAI tts-1 은 24kHz 고정)");
      } else pass("TTS 샘플레이트", "벤더와 맞음");
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

function report(results, human) {
  for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.label.padEnd(34)} ${r.detail}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? `\n${failed}개 남았어요. 아직 "된다"고 말하지 마세요.` : `\n기계 검증 통과. 이제 사람이 확인할 차례예요. ${human}`);
  process.exit(failed ? 1 : 0);
}

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

// avatar-ai-web/ 기준 상대 경로.
function changedFiles(fail) {
  try {
    const diff = git(["diff", "--name-only", "--relative", "HEAD"]).split("\n").filter(Boolean);
    const untracked = git(["ls-files", "--others", "--exclude-standard"]).split("\n").filter(Boolean);
    return [...diff, ...untracked];
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
