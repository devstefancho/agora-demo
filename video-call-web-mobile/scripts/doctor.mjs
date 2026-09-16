#!/usr/bin/env node
// 준비 상태 점검. 통합 전에 무엇이 빠졌는지 한 번에 본다. 시크릿 값은 출력하지 않는다.
// ✓ 통과 · ✗ 고쳐야 함 · △ 선택 (없어도 실패가 아니다)

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// video-call-web-mobile/ 기준. env 는 web/.env.local 이다.
const WEB = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "web");

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
if (cliVersion) {
  try {
    execFileSync("agora", ["auth", "status", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    ok("agora 로그인", "세션 있음");
  } catch {
    bad("agora 로그인", "세션 없음", "agora login");
  }
}

// .env.local
const envPath = join(WEB, ".env.local");
let env = {};
if (!existsSync(envPath)) {
  bad("web/.env.local", "없음", "cd web && agora project env write --template nextjs  (App ID·Certificate)");
} else {
  env = Object.fromEntries(
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

// cloudflared: 폰 브라우저로 들어올 때만 (HTTPS 터널)
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
