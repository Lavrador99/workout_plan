#!/usr/bin/env node
// One command to put the coach API online (run from the repo root: npm run deploy:api).
// 1. checks the Cloudflare login   2. creates the D1 database once (fills wrangler.toml)
// 3. applies migrations             4. deploys the Worker
// 5. sets the sync key once and prints the address + key to paste in the app.

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOML = join(ROOT, "wrangler.toml");
const TOKEN_FILE = join(ROOT, ".coach-token");
const DB_NAME = "coach-db";
const PLACEHOLDER = "00000000-0000-0000-0000-000000000000";

/** Run wrangler; stdout is shown live and also returned. */
function wrangler(args, { input, quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn("npx", ["wrangler", ...args], { cwd: ROOT, stdio: [input == null ? "inherit" : "pipe", "pipe", "inherit"], shell: process.platform === "win32" });
    let out = "";
    p.stdout.on("data", (d) => {
      out += d;
      if (!quiet) process.stdout.write(d);
    });
    if (input != null) p.stdin.end(input);
    p.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`wrangler ${args.join(" ")} falhou (código ${code})`))));
  });
}

function step(msg) {
  console.log(`\n━━ ${msg}`);
}

async function main() {
  step("1/5 Login na Cloudflare");
  const who = await wrangler(["whoami"], { quiet: true }).catch(() => "");
  if (/not authenticated/i.test(who) || !who) {
    console.log("Vai abrir o browser para entrares na Cloudflare…");
    await wrangler(["login"]);
  } else console.log("Já tens sessão iniciada.");

  step("2/5 Base de dados D1");
  let toml = readFileSync(TOML, "utf8");
  if (toml.includes(PLACEHOLDER)) {
    const list = JSON.parse((await wrangler(["d1", "list", "--json"], { quiet: true })) || "[]");
    let db = list.find((d) => d.name === DB_NAME);
    if (!db) {
      await wrangler(["d1", "create", DB_NAME]);
      db = JSON.parse(await wrangler(["d1", "list", "--json"], { quiet: true })).find((d) => d.name === DB_NAME);
    }
    if (!db?.uuid) throw new Error("Não encontrei o id da base de dados criada.");
    toml = toml.replace(PLACEHOLDER, db.uuid);
    writeFileSync(TOML, toml);
    console.log(`Base de dados ${DB_NAME}: ${db.uuid} (guardado em wrangler.toml — faz commit deste ficheiro)`);
  } else console.log("Já configurada.");

  step("3/5 Tabelas");
  await wrangler(["d1", "migrations", "apply", DB_NAME, "--remote"], { input: "y\n" });

  step("4/5 Publicar a API");
  const out = await wrangler(["deploy"]);
  const url = out.match(/https:\/\/[\w.-]+\.workers\.dev/)?.[0];

  step("5/5 Chave de sincronização");
  let token = existsSync(TOKEN_FILE) ? readFileSync(TOKEN_FILE, "utf8").trim() : "";
  if (!token) {
    token = randomBytes(24).toString("base64url");
    await wrangler(["secret", "put", "SYNC_TOKEN"], { input: token });
    writeFileSync(TOKEN_FILE, token + "\n");
    console.log("Chave nova criada (guardada em apps/coach-api/.coach-token, fora do git).");
  } else console.log("A usar a chave já existente.");

  console.log(`
════════════════════════════════════════════════════════════
 Pronto! Na app → Definições → Sincronização, cola:

   Endereço: ${url ?? "(vê o endereço *.workers.dev acima)"}
   Chave:    ${token}

 Usa os mesmos dois valores no telemóvel e no PC.
════════════════════════════════════════════════════════════`);
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
