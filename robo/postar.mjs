// Robô de postagem do Instagram.
// Roda no GitHub Actions a cada 15 minutos: lê a agenda de dados.js, procura o vídeo na pasta do Drive
// e publica no Instagram o que estiver na hora. Publica no máximo 1 item por execução.
//
// A agenda e a aprovação vêm só de dados.js (quem publica no repositório decide o que vai ao ar).
// O banco de marcações é usado para mostrar o estado na Central e para não repetir post; nunca para liberar um.
import { readFile } from "node:fs/promises";

const bruto = await readFile(new URL("../dados.js", import.meta.url), "utf8");
const D = JSON.parse(bruto.slice(bruto.indexOf("{")).trim().replace(/;\s*$/, ""));
const R = D.robo || {};
const { META_TOKEN, IG_USER_ID, DRIVE_KEY } = process.env;
const SECO = !!process.env.DRY_RUN;
const AGORA = process.env.AGORA ? Date.parse(process.env.AGORA) : Date.now();
const G = `https://graph.facebook.com/${process.env.GRAPH_VERSION || "v23.0"}`;
const MARCAS = D.sync.replace(/\/+$/, "") + "/central/marcas.json";
const LIMITE_ATRASO = 3 * 24 * 3600e3; // item com mais de 3 dias de atraso não posta sozinho
const dormir = ms => new Promise(r => setTimeout(r, ms));

async function json(url, opt) {
  const r = await fetch(url, opt);
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  if (!r.ok) throw new Error(`${r.status} ${typeof j === "string" ? j.slice(0, 200) : JSON.stringify(j.error || j).slice(0, 400)}`);
  return j;
}
const gpost = (caminho, params) => json(`${G}/${caminho}`, { method: "POST", body: new URLSearchParams({ ...params, access_token: META_TOKEN }) });
const gget = caminho => json(`${G}/${caminho}`, { headers: { Authorization: `Bearer ${META_TOKEN}` } });
const m = v => ({ v, por: "Robô", em: Date.now() });
const marcar = obj => SECO ? console.log("[teste] marcaria:", JSON.stringify(obj))
  : json(MARCAS, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) });

const legendaDe = (it, rot) => (it.legenda || `${rot.legenda}\n\n${D.hashtagsBase} ${rot.hashtags}`).trim();

async function listarPasta() {
  if (process.env.ARQUIVOS_TESTE) return process.env.ARQUIVOS_TESTE.split(",").map(n => ({ id: "teste", name: n.trim(), mimeType: "video/mp4" }));
  if (!DRIVE_KEY || !R.pastaId) return null;
  const q = encodeURIComponent(`'${R.pastaId}' in parents and trashed=false`);
  const r = await json(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size)&pageSize=200&key=${DRIVE_KEY}`);
  return r.files || [];
}

async function esperar(id) {
  for (let i = 0; i < 72; i++) {
    const s = await gget(`${id}?fields=status_code,status`);
    if (s.status_code === "FINISHED") return;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error(`Instagram recusou a mídia: ${s.status || s.status_code}`);
    await dormir(5000);
  }
  throw new Error("Instagram demorou mais de 6 minutos para processar a mídia");
}

async function jaNoInstagram(legenda) {
  const r = await gget(`${IG_USER_ID}/media?fields=caption,permalink&limit=25`);
  return (r.data || []).find(p => (p.caption || "").trim() === legenda);
}

async function postarReel(arq, legenda) {
  const resp = await fetch(`https://www.googleapis.com/drive/v3/files/${arq.id}?alt=media&key=${DRIVE_KEY}`);
  if (!resp.ok) throw new Error(`Não consegui baixar o vídeo do Drive (${resp.status})`);
  const video = Buffer.from(await resp.arrayBuffer());
  const c = await gpost(`${IG_USER_ID}/media`, { media_type: "REELS", upload_type: "resumable", caption: legenda, share_to_feed: "true" });
  const up = await fetch(c.uri, { method: "POST", headers: { Authorization: `OAuth ${META_TOKEN}`, offset: "0", file_size: String(video.length) }, body: video });
  if (!up.ok) throw new Error(`Envio do vídeo ao Instagram falhou (${up.status})`);
  await esperar(c.id);
  return gpost(`${IG_USER_ID}/media_publish`, { creation_id: c.id });
}

async function postarCarrossel(it, legenda) {
  const filhos = [];
  for (let i = 1; i <= it.slides; i++) {
    const url = `${R.site}/${it.pasta}/slide-${String(i).padStart(2, "0")}.jpg`;
    const f = await gpost(`${IG_USER_ID}/media`, { image_url: url, is_carousel_item: "true" });
    filhos.push(f.id);
  }
  const c = await gpost(`${IG_USER_ID}/media`, { media_type: "CAROUSEL", children: filhos.join(","), caption: legenda });
  await esperar(c.id);
  return gpost(`${IG_USER_ID}/media_publish`, { creation_id: c.id });
}

// ---- execução ----
const marcas = (await json(MARCAS)) || {};
const arquivos = await listarPasta();
const novas = {};
let escolhido = null;

for (const it of [...(D.agenda || [])].sort((a, b) => Date.parse(a.data) - Date.parse(b.data))) {
  const rot = it.roteiro ? D.roteiros.find(r => r.n === it.roteiro) : null;
  const quando = Date.parse(it.data);
  const reel = it.tipo === "reel";
  const feito = reel ? marcas["r" + rot.n]?.v === "postado" : marcas["pub-" + it.id]?.v === "postado";
  let arq = null;
  if (reel && arquivos) {
    arq = arquivos.find(f => (f.mimeType || "").startsWith("video/") && new RegExp(`^0*${rot.n}(\\D|$)`).test(f.name));
    if (arq && !marcas["arq-" + it.id]) novas["arq-" + it.id] = m(true);
    if (!arq && marcas["arq-" + it.id]) novas["arq-" + it.id] = null;
  }
  const aprovado = reel ? it.aprovado !== false : it.aprovado === true;
  const estado = feito ? "já postado"
    : marcas["erro-" + it.id] ? "falhou antes (espera 'Tentar de novo' na Central)"
    : !aprovado ? "não aprovado"
    : quando > AGORA ? "ainda não é hora"
    : AGORA - quando > LIMITE_ATRASO ? "mais de 3 dias de atraso (reagendar)"
    : reel && !arq ? "sem vídeo na pasta"
    : "pronto";
  console.log(`${it.id.padEnd(4)} ${it.data}  ${estado}  ${rot ? rot.titulo : it.titulo}`);
  if (estado === "pronto" && !escolhido) escolhido = { it, rot, arq };
}

if (Object.keys(novas).length) await marcar(novas);

if (!escolhido) { console.log("Nada para postar agora."); process.exit(0); }
if (!R.ligado) { console.log(`Robô desligado em dados.js. Postaria: ${escolhido.it.id}.`); process.exit(0); }
if (!META_TOKEN || !IG_USER_ID) { console.log("Faltam as chaves da Meta nos secrets do repositório."); process.exit(0); }

const { it, rot, arq } = escolhido;
const legenda = legendaDe(it, rot);
if (SECO) { console.log(`[teste] postaria ${it.tipo} ${it.id}${arq ? " com o arquivo " + arq.name : ""}\n--- legenda ---\n${legenda}`); process.exit(0); }

const chavePostado = it.tipo === "reel" ? "r" + rot.n : "pub-" + it.id;
try {
  const existente = await jaNoInstagram(legenda);
  if (existente) {
    console.log(`Já existe no Instagram com a mesma legenda: ${existente.permalink}. Só marco como postado.`);
  } else {
    const pub = it.tipo === "reel" ? await postarReel(arq, legenda) : await postarCarrossel(it, legenda);
    const info = await gget(`${pub.id}?fields=permalink`).catch(() => ({}));
    console.log(`Postado: ${info.permalink || pub.id}`);
  }
  await marcar({ [chavePostado]: m("postado") });
} catch (e) {
  console.error(`Falhou ao postar ${it.id}: ${e.message}`);
  await marcar({ ["erro-" + it.id]: m("falhou") }).catch(() => {});
  process.exitCode = 1;
}
