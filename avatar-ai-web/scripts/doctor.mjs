#!/usr/bin/env node
// 준비 상태 점검. 통합 전에 무엇이 빠졌는지 한 번에 본다. 시크릿 값은 출력하지 않는다.
// ✓ 통과 · ✗ 고쳐야 함 · △ 선택 (없어도 실패가 아니다)

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// avatar-ai-web/ 기준. env 는 .env.local 이다.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
const envPath = join(ROOT, ".env.local");
let env = {};
if (!existsSync(envPath)) {
  bad(".env.local", "없음", "agora project env write --template nextjs  (App ID·Certificate)");
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
    else bad(key, "비어 있음", "agora project env write --template nextjs");
  }
}

// 아바타 벤더: 없어도 실패가 아니다. 비어 있으면 Mia 는 얼굴 없이 목소리로만 대화한다.
// 값은 사용자가 .env.local 에 직접 넣는다(벤더 콘솔에서 발급). 이 스크립트는 값을 출력하지 않는다.
const AVATAR_VENDORS = ["liveavatar", "anam"];
if (!env.AVATAR_VENDOR) {
  opt("AVATAR_VENDOR", "비어 있음 (목소리로만 대화)", `.env.local 에 AVATAR_VENDOR=${AVATAR_VENDORS.join(" 또는 ")}`);
} else if (AVATAR_VENDORS.includes(env.AVATAR_VENDOR)) {
  ok("AVATAR_VENDOR", env.AVATAR_VENDOR);
} else {
  bad("AVATAR_VENDOR", "지원하지 않는 값", `${AVATAR_VENDORS.join(" 또는 ")} 중 하나로 바꾸세요`);
}
if (env.AVATAR_API_KEY) ok("AVATAR_API_KEY", "설정됨");
else if (env.AVATAR_VENDOR) bad("AVATAR_API_KEY", "비어 있음", "벤더 콘솔의 API 키를 .env.local 에 넣으세요");
else opt("AVATAR_API_KEY", "비어 있음 (아바타를 쓸 때만)", "벤더 콘솔의 API 키");
if (env.AVATAR_ID) ok("AVATAR_ID", "설정됨");
else opt("AVATAR_ID", "비어 있음 (벤더 기본 아바타)", "벤더의 스톡 아바타 식별자");

for (const c of checks) {
  const mark = c.status === "ok" ? "✓" : c.status === "opt" ? "△" : "✗";
  console.log(`${mark} ${c.name.padEnd(28)} ${c.detail}${c.fix ? `\n    → ${c.fix}` : ""}`);
}
const failed = checks.filter((c) => c.status === "fail").length;
console.log(failed ? `\n${failed}개 남았어요.` : "\n준비 끝. 통합을 시작할 차례예요.");
process.exit(failed ? 1 : 0);
