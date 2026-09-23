#!/usr/bin/env node
// 통합 결과 기계 검증(개발 맥). 모델이 "됐다"고 말하기 전에 스스로 돌리는 체크리스트.
// 기기 빌드와 실제 음성 왕복은 기기에서 사람이 확인한다. 이 스크립트는 그 전 단계의 실수만 잡는다.
//
//   node scripts/check-integration.mjs device

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), ".."); // voice-ai-device/
const WEB = join(ROOT, "web");

const SHELL_MARK = "껍데기: 통합 단계가 이 파일을 채운다.";
const ROUTE_SHELL = "아직 껍데기";
const LINK = "device/agora_link.c";
const TOKEN_ROUTE = "web/app/api/token/route.ts";
const AGENT_ROUTE = "web/app/api/agent/route.ts";
const SHELLS = [LINK, TOKEN_ROUTE, AGENT_ROUTE];
const SERVER_SDKS = ["agora-agents", "agora-token"];
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "public", "sdk", "io.agora.rtc_sdk", ".claude"]);

// 통합이 바꾸면 안 되는 곳 (voice-ai-device/ 기준)
const FROZEN = [
  "device/speaker.c",
  "device/agora_link.h",
  "device/Makefile",
  "device/sdk.sh",
  "web/components/",
  "web/content/",
  "web/lib/mia.ts",
  "web/app/page.tsx",
  "web/app/layout.tsx",
  "web/app/globals.css",
  "scripts/",
  "docs/",
];

const NEEDLES = {
  [LINK]: ["agora_rtc_join_channel", "agora_rtc_send_audio_data", "AUDIO_CODEC_TYPE_G722", "enable_audio_decode"],
  [AGENT_ROUTE]: ["output_audio_codec", "enableStringUid: false", "buildMiaInstructions"],
  [TOKEN_ROUTE]: ["buildTokenWithUid"],
};
const ROUTE_METHODS = { [TOKEN_ROUTE]: ["GET"], [AGENT_ROUTE]: ["POST", "DELETE"] };

if (process.argv[2] !== "device") {
  console.error("사용법: node scripts/check-integration.mjs device");
  process.exit(2);
}

const results = [];
const pass = (label, detail = "") => results.push({ ok: true, label, detail });
const fail = (label, detail) => results.push({ ok: false, label, detail });
const read = (p) => (existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p), "utf8") : "");

// a. 경계 밖 보존
const changed = changedFiles();
const touched = changed.filter((f) => FROZEN.some((p) => f === p || f.startsWith(p)));
if (touched.length) fail("경계 밖 보존", `바뀌면 안 되는 파일: ${touched.join(", ")}`);
else pass("경계 밖 보존", "기기 본체·화면·콘텐츠·도구 그대로");

// b. SDK 격리
const leaks = [];
for (const file of sourceFiles(ROOT)) {
  const rel = relative(ROOT, file);
  const text = readFileSync(file, "utf8");
  if (/\.(c|h)$/.test(rel) && text.includes("agora_rtc_api.h") && rel !== LINK) leaks.push(`${rel} (agora_rtc_api.h)`);
  if (/\.(ts|tsx|mjs|js)$/.test(rel)) {
    for (const sdk of SERVER_SDKS) {
      const imported = new RegExp(`from\\s+["']${sdk}["']|import\\(\\s*["']${sdk}["']`).test(text);
      if (imported && !rel.startsWith("web/app/api/")) leaks.push(`${rel} (${sdk})`);
    }
  }
}
if (leaks.length) fail("SDK 격리", leaks.join(", "));
else pass("SDK 격리", "IoT SDK 는 agora_link.c, 서버 SDK 는 app/api/ 안");

// c. 껍데기 표식 소멸
const shelled = SHELLS.filter((p) => read(p).includes(SHELL_MARK));
if (shelled.length) fail("껍데기 표식", `아직 남음: ${shelled.join(", ")}`);
else pass("껍데기 표식", "세 파일 모두 채워짐");

// d. route 메서드와 501
for (const [p, methods] of Object.entries(ROUTE_METHODS)) {
  const text = read(p);
  const missing = methods.filter((m) => !new RegExp(`export\\s+async\\s+function\\s+${m}\\b`).test(text));
  if (text.includes(ROUTE_SHELL)) fail(`route ${p}`, "아직 501 껍데기");
  else if (missing.length) fail(`route ${p}`, `메서드 없음: ${missing.join(", ")}`);
  else pass(`route ${p}`, methods.join("·"));
}

// e. 시크릿이 클라이언트·기기 코드에 없나
const secretHits = [];
for (const dir of ["web/lib", "web/components", "device"]) {
  for (const file of sourceFiles(join(ROOT, dir))) {
    const text = readFileSync(file, "utf8");
    if (/APP_CERTIFICATE/.test(text) || /\b[0-9a-f]{32}\b/.test(text)) secretHits.push(relative(ROOT, file));
  }
}
if (secretHits.length) fail("시크릿 노출", secretHits.join(", "));
else pass("시크릿 노출", "없음");

// f·g. 필수 문자열
for (const [p, needles] of Object.entries(NEEDLES)) {
  const text = read(p);
  const missing = needles.filter((n) => !text.includes(n));
  if (missing.length) fail(`내용 ${p}`, `없음: ${missing.join(", ")}`);
  else pass(`내용 ${p}`, needles.join(", "));
}

// h. lint·build
for (const script of ["lint", "build"]) {
  try {
    execFileSync("pnpm", [script], { cwd: WEB, stdio: ["ignore", "pipe", "pipe"] });
    pass(`pnpm ${script}`);
  } catch (e) {
    const tail = `${e.stdout ?? ""}${e.stderr ?? ""}`.trim().split("\n").slice(-6).join("\n    ");
    fail(`pnpm ${script}`, tail);
  }
}

for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.label}${r.detail ? `  ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed}개 실패. 아직 "된다"고 말하지 마세요.` : "\n기계 검증 통과. 기기에서 빌드하고 사람이 확인할 차례예요.");
process.exit(failed ? 1 : 0);

function changedFiles() {
  try {
    const opts = { cwd: ROOT, encoding: "utf8" };
    const diff = execFileSync("git", ["diff", "HEAD", "--name-only", "--relative"], opts);
    const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], opts);
    return `${diff}\n${untracked}`.split("\n").map((s) => s.trim()).filter(Boolean);
  } catch {
    fail("git", "git 저장소가 아니거나 HEAD 커밋이 없어요. 단계 A 를 커밋했는지 보세요");
    return [];
  }
}

function sourceFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx|mjs|js|c|h)$/.test(entry.name)) out.push(full);
  }
  return out;
}
