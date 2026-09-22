#!/usr/bin/env node
// 준비 상태 점검. 통합 전에 무엇이 빠졌는지 한 번에 본다. 시크릿 값은 출력하지 않는다.
// ✓ 통과 · ✗ 고쳐야 함 · △ 선택 (없어도 실패가 아니다)

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// voice-ai-web/ 기준. env 는 이 디렉토리의 .env.local 이다.
const APP = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const checks = [];
const ok = (name, detail) => checks.push({ status: "ok", name, detail });
const bad = (name, detail, fix) => checks.push({ status: "fail", name, detail, fix });
const opt = (name, detail, fix) => checks.push({ status: "opt", name, detail, fix });

// Node
const major = Number(process.versions.node.split(".")[0]);
if (major >= 22) ok("Node.js", process.versions.node);
else bad("Node.js", process.versions.node, "Node 22 이상으로 올리세요 (nvm install 22)");

// agora CLI
let cliVersion = null;
try {
  const out = execFileSync("agora", ["version"], { encoding: "utf8" });
  cliVersion = out.match(/Version\s*:\s*([\d.]+)/)?.[1] ?? out.trim();
  ok("agora CLI", cliVersion);
} catch {
  bad("agora CLI", "설치 안 됨", "curl -fsSL https://raw.githubusercontent.com/AgoraIO/cli/main/install.sh | sh");
}

// agora login
let loggedIn = false;
if (cliVersion) {
  try {
    execFileSync("agora", ["auth", "status", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    ok("agora 로그인", "세션 있음");
    loggedIn = true;
  } catch {
    bad("agora 로그인", "세션 없음", "agora login");
  }
}

// Conversational AI 기능: 프로젝트에서 켜져 있어야 에이전트를 부를 수 있다.
if (loggedIn) {
  let enabled = null;
  try {
    const out = execFileSync("agora", ["project", "doctor", "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    enabled = parseConvoAi(out);
  } catch (err) {
    // 경고가 있으면 0 이 아닌 코드로 끝나도 JSON 은 나온다
    enabled = parseConvoAi(String(err?.stdout ?? ""));
  }
  if (enabled === true) ok("Conversational AI", "켜짐");
  else if (enabled === false) bad("Conversational AI", "꺼짐", "agora project feature enable convoai");
  else bad("Conversational AI", "확인 못 함", "agora project use <프로젝트> 후 agora project doctor");
}

// .env.local
const envPath = join(APP, ".env.local");
if (!existsSync(envPath)) {
  bad(".env.local", "없음", "agora project env write --template nextjs  (App ID·Certificate)");
} else {
  const env = Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
  for (const key of ["NEXT_PUBLIC_AGORA_APP_ID", "NEXT_AGORA_APP_CERTIFICATE"]) {
    if (env[key]) ok(key, "설정됨");
    else bad(key, "비어 있음", "agora project env write --template nextjs");
  }
}

// cloudflared: 폰 브라우저로 들어올 때만 (마이크는 HTTPS 에서만 열린다)
try {
  const out = execFileSync("cloudflared", ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  ok("cloudflared", out.trim().split("\n")[0]);
} catch {
  opt("cloudflared", "없음 (폰 브라우저 접속에만 필요)", "brew install cloudflared");
}

for (const c of checks) {
  const mark = c.status === "ok" ? "✓" : c.status === "opt" ? "△" : "✗";
  console.log(`${mark} ${c.name.padEnd(28)} ${c.detail}${c.fix ? `\n    → ${c.fix}` : ""}`);
}
const failed = checks.filter((c) => c.status === "fail").length;
console.log(failed ? `\n${failed}개 남았어요.` : "\n준비 끝. 통합을 시작할 차례예요.");
process.exit(failed ? 1 : 0);

// project doctor --json 에서 convoai_enabled 항목만 본다. 찾지 못하면 null.
function parseConvoAi(out) {
  try {
    const data = JSON.parse(out);
    const items = (data?.data?.checks ?? []).flatMap((c) => c.items ?? []);
    const item = items.find((i) => i.name === "convoai_enabled");
    return item ? item.status === "pass" : null;
  } catch {
    return null;
  }
}
