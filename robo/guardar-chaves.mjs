// Troca o token curto da Meta por um token de Página que não expira, descobre o ID do Instagram
// e guarda os dois como secrets do repositório, sem mostrar nenhum deles na tela.
// Uso (no terminal, dentro da pasta painel-felipe-avancini):  node robo/guardar-chaves.mjs
import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";

const REPO = "matheuslopescwb1/painel-felipe-avancini";
const G = `https://graph.facebook.com/${process.env.GRAPH_VERSION || "v23.0"}`;
const rl = createInterface({ input: process.stdin, output: process.stdout });
const pedir = async t => (await rl.question(t)).trim();

async function json(url) {
  const r = await fetch(url); const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || r.status);
  return j;
}
function guardar(nome, valor) {
  const r = spawnSync("gh", ["secret", "set", nome, "--repo", REPO], { input: valor, shell: true, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`Não consegui guardar ${nome}: ${r.stderr}`);
  console.log(`  ${nome} guardado.`);
}

try {
  console.log("Cole cada valor e aperte Enter. Nada disso é mostrado de volta nem salvo em arquivo.\n");
  const appId = await pedir("ID do aplicativo da Meta: ");
  const appSecret = await pedir("Chave secreta do aplicativo: ");
  const curto = await pedir("Token gerado no Explorador da Graph API: ");
  const drive = await pedir("Chave de API do Google Drive (Enter para pular): ");

  const longo = await json(`${G}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${curto}`);
  const contas = await json(`${G}/me/accounts?fields=name,access_token,instagram_business_account{id,username}&limit=100&access_token=${longo.access_token}`);
  const comIg = (contas.data || []).filter(p => p.instagram_business_account);
  if (!comIg.length) throw new Error("Nenhuma Página com Instagram profissional ligado apareceu para este token. Confira se a Página do Felipe foi marcada ao gerar o token.");

  let pagina = comIg[0];
  if (comIg.length > 1) {
    comIg.forEach((p, i) => console.log(`  ${i + 1}. ${p.name} (@${p.instagram_business_account.username})`));
    pagina = comIg[Number(await pedir("Qual é a do Felipe? Número: ")) - 1] || comIg[0];
  }
  console.log(`\nPágina: ${pagina.name} · Instagram: @${pagina.instagram_business_account.username}`);
  guardar("META_TOKEN", pagina.access_token);
  guardar("IG_USER_ID", pagina.instagram_business_account.id);
  if (drive) guardar("DRIVE_KEY", drive);
  console.log("\nPronto. Avise o Claude para fazer o teste e ligar o robô.");
} catch (e) {
  console.error("\nNão deu certo: " + e.message);
  process.exitCode = 1;
} finally {
  rl.close();
}
