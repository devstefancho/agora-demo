#!/usr/bin/env node
// 준비 상태 점검(개발 맥). 통합 전에 무엇이 빠졌는지 한 번에 본다. 시크릿 값은 출력하지 않는다.
// ✓ 통과 · ✗ 고쳐야 함 · △ 안내 (없어도 실패가 아니다)

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// voice-ai-device/ 기준. env 는 web/.env.local 이다.
const WEB = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "web");

const checks = [];
const ok = (name, detail) => checks.push({ status: "ok", name, detail });
const bad = (name, detail, fix) => checks.push({ status: "fail", name, detail, fix });
const note = (name, detail, fix) => checks.push({ status: "opt", name, detail, fix });

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

// ConvoAI 가 켜진 프로젝트인가 (project doctor 는 경고만 있어도 종료 코드가 0 이 아니라서 출력을 읽는다)
if (loggedIn) {
  let out = "";
  try {
    out = execFileSync("agora", ["project", "doctor", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch (e) {
    out = e.stdout?.toString() ?? "";
  }
  try {
    const items = JSON.parse(out).data.checks.flatMap((c) => c.items);
    const convoai = items.find((i) => i.name === "convoai_enabled");
    if (convoai?.status === "pass") ok("ConvoAI", "프로젝트에 켜져 있음");
    else bad("ConvoAI", convoai?.message ?? "확인 안 됨", "Agora 콘솔에서 이 프로젝트의 Conversational AI 를 켜세요 (agora project doctor)");
  } catch {
    bad("ConvoAI", "agora project doctor 를 읽지 못함", "agora project use <프로젝트> 후 다시");
  }
}

// .env.local
const envPath = join(WEB, ".env.local");
if (!existsSync(envPath)) {
  bad("web/.env.local", "없음", "cd web && agora project env write --template nextjs  (App ID·Certificate)");
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
    else bad(key, "비어 있음", "cd web && agora project env write --template nextjs");
  }
}

// 기기는 여기서 볼 수 없다. 기기에서 할 일만 안내한다.
note("리눅스 기기", "기기에서 직접 준비", "sudo apt install gcc make libasound2-dev libcurl4-openssl-dev && cd device && ./sdk.sh && make  (device/README.md)");

for (const c of checks) {
  const mark = c.status === "ok" ? "✓" : c.status === "opt" ? "△" : "✗";
  console.log(`${mark} ${c.name.padEnd(28)} ${c.detail}${c.fix ? `\n    → ${c.fix}` : ""}`);
}
const failed = checks.filter((c) => c.status === "fail").length;
console.log(failed ? `\n${failed}개 남았어요.` : "\n준비 끝. 통합을 시작할 차례예요.");
process.exit(failed ? 1 : 0);
