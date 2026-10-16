#!/usr/bin/env node
/*
  tools/gerar-dados.js — gera assets/archsim-dados.js (os dados reais da VM usados pelo
  simulador: pacotes, arquivos de /etc, /usr/bin, serviços, journal, pacman.log).

  Uso:
    node tools/gerar-dados.js            # usa tools/vm/pacman.json e tools/vm/sistema.json
    node tools/gerar-dados.js --extrair  # antes, extrai de novo da VM (só leitura; ~1 min):
        ~/guia-arch-lab/vm 'python3 -' < tools/vm/extrair-pacman.py > tools/vm/pacman.json
        ~/guia-arch-lab/vm -u root 'python3 -' < tools/vm/extrair-sistema.py > tools/vm/sistema.json
        ~/guia-arch-lab/vm 'python3 -' < tools/vm/extrair-home.py > tools/vm/home.json

  O arquivo gerado tem um JSON comprimido (gzip + base64), descomprimido pelo bashsim.js
  (no navegador com DecompressionStream; no Node com zlib).

  O estado "limpo" da VM é o do snapshot pronto-para-aulas: o que os autores criaram depois
  (pastas em /tmp, /mnt/a8, usuários teste-*, logins por SSH, serviços ligados para testes)
  é filtrado aqui.
*/
"use strict";
var fs = require("fs"), path = require("path"), zlib = require("zlib"), cp = require("child_process");
var RAIZ = path.join(__dirname, "..");
var VMDIR = path.join(__dirname, "vm");
var VM = path.join(process.env.HOME || "/home/wallyson", "guia-arch-lab", "vm");

if (process.argv.indexOf("--extrair") >= 0) {
  [["extrair-pacman.py", "pacman.json", []], ["extrair-sistema.py", "sistema.json", ["-u", "root"]], ["extrair-home.py", "home.json", []]].forEach(function (x) {
    process.stderr.write("extraindo " + x[1] + " da VM...\n");
    var r = cp.spawnSync("timeout", ["280", VM].concat(x[2], ["python3 -"]), { input: fs.readFileSync(path.join(VMDIR, x[0])), maxBuffer: 256 * 1024 * 1024 });
    if (r.status !== 0) { process.stderr.write("falhou: " + r.stderr + "\n"); process.exit(1); }
    fs.writeFileSync(path.join(VMDIR, x[1]), r.stdout);
  });
}

var P = JSON.parse(fs.readFileSync(path.join(VMDIR, "pacman.json"), "utf8"));
var S = JSON.parse(fs.readFileSync(path.join(VMDIR, "sistema.json"), "utf8"));

/* ---------------- pacman ---------------- */
var tabela = [], idx = Object.create(null);
function T(s) { if (s === undefined || s === null) s = ""; if (!(s in idx)) { idx[s] = tabela.length; tabela.push(s); } return idx[s]; }
function lst(a) { return (a || []).map(T); }
var VALID = { "Signature": "Assinatura", "SHA-256 Sum  Signature": "Soma SHA-256  Assinatura", "SHA-256 Sum": "Soma SHA-256", "None": "Nenhum" };
// campos: 0 versão, 1 descrição, 2 arquitetura, 3 url, 4 licenças, 5 grupos, 6 provê, 7 depende, 8 opcionais,
//         9 conflita, 10 substitui, 11 empacotador, 12 validado, 13 tamanho instalado, 14 data de compilação
function base(p) {
  return [p.v, p.d, T(p.a), p.u, lst(p.l), lst(p.g), p.p, p.D, p.o, p.c, p.r, T(p.k), T(VALID[p.V] || p.V), p.m, p.b];
}
var local = {}, repo = {};
Object.keys(P.local).sort().forEach(function (n) {
  var p = P.local[n], e = base(p);
  // 15 explícito, 16 script de instalação, 17 data de instalação, 18 repositório+download (se igual ao repo)
  e.push(p.e, p.s, p.i);
  var r = P.repo[n];
  e.push(r && r.v === p.v ? [r.R, r.K, T(VALID[r.V] || r.V)] : (r ? 0 : null));
  local[n] = e;
});
Object.keys(P.repo).sort().forEach(function (n) {
  var r = P.repo[n], l = P.local[n];
  if (l && l.v === r.v) return; // igual ao instalado: guardado no local
  var e = base(r); e.push(r.R, r.K);
  repo[n] = e;
});
// arquivos: compressão por prefixo comum
function comprimir(lista) {
  var out = [], ant = "";
  lista.forEach(function (f) { var i = 0; while (i < ant.length && i < f.length && ant[i] === f[i]) i++; out.push(i.toString(36) + "|" + f.slice(i)); ant = f; });
  return out.join("\n");
}
var arquivos = {};
Object.keys(P.arquivos).forEach(function (n) { arquivos[n] = comprimir(P.arquivos[n]); });
// donos: caminho -> pacote (comprimido por prefixo, ordenado)
var donosOrd = Object.keys(P.donos).sort();
var donos = { f: comprimir(donosOrd), p: donosOrd.map(function (f) { return T(P.donos[f]); }) };
var gat = {};
Object.keys(P.gatilhos).forEach(function (n) { var g = P.gatilhos[n]; gat[n] = g.N !== undefined ? [g.N, g.I] : [g.n, g.i, g.u, g.r]; });
var pac = {
  hooks: P.hooks.map(function (h) { return [h.n, h.d, h.w]; }), gat: gat,
  local: local, repo: repo, grupos: P.grupos, prov: P.provedores, arquivos: arquivos, donos: donos,
  cache: P.cache, F: P.F, Fdb: P.Fdb, inexistentes: P.alvos_inexistentes, bins: P.bins || {}
};

/* ---------------- sistema de arquivos (esqueleto) ---------------- */
var A = S.arquivos, PS = S.pastas;
// [caminho, tipo, modo, uid, gid, mtime, tamanho, conteúdo|alvo]
var fsl = [], vistos = {};
function add(cam, i, conteudo) {
  if (vistos[cam]) return; vistos[cam] = 1;
  var e = [cam, i.t, i.m, i.u, i.g, i.mt, i.s];
  if (i.t === "l") e.push(i.l);
  else if (conteudo !== undefined) e.push(conteudo);
  fsl.push(e);
}
var IGNORAR = /^\/(mnt\/a8|home\/teste-|tmp\/)|^\/etc\/(passwd-|group-|shadow-|gshadow-|subuid-|subgid-)$/;
// pastas listadas: primeiro a própria pasta, depois os filhos
Object.keys(PS).sort().forEach(function (dir) {
  if (dir === "/dev") return;
  add(dir, PS[dir].self);
  var c = PS[dir].c;
  Object.keys(c).forEach(function (n) {
    var cam = (dir === "/" ? "" : dir) + "/" + n;
    if (IGNORAR.test(cam)) return;
    if (dir === "/home" && n !== "ana") return;
    if (dir === "/root" || cam === "/home/ana") return; // a pasta da ana e a do root são montadas no bashsim.js
    if (A[cam] && A[cam].c !== undefined) return; // vem com conteúdo abaixo
    if (PS[cam]) return;
    add(cam, c[n]);
  });
});
Object.keys(A).forEach(function (cam) {
  if (/^\/(proc|home|root)\//.test(cam) || IGNORAR.test(cam)) return;
  var i = A[cam];
  if (i.t === "d") { add(cam, i); return; }
  add(cam, i, i.c);
});
// /usr/share/zoneinfo/America/Sao_Paulo (alvo de /etc/localtime)
var proc = {};
["/proc/cmdline", "/proc/version", "/proc/cpuinfo", "/proc/meminfo", "/proc/loadavg", "/proc/uptime"].forEach(function (p) { if (A[p]) proc[p] = A[p].c; });

/* ---------------- serviços ---------------- */
// estado limpo (pronto-para-aulas): o que os autores ligaram para testes volta ao padrão
var LIMPO = {
  "nginx.service": ["inactive", "dead", "disabled"], "cronie.service": ["inactive", "dead", "disabled"],
  "podman.socket": ["inactive", "dead", "disabled"], "podman.service": ["inactive", "dead", "disabled"],
  "snapper-timeline.timer": ["inactive", "dead", "disabled"], "snapper-cleanup.timer": ["inactive", "dead", "disabled"],
  "snapperd.service": ["inactive", "dead", "static"], "systemd-zram-setup@zram0.service": ["inactive", "dead", "static"],
  "ufw.service": ["inactive", "dead", "disabled"], "reflector.timer": ["inactive", "dead", "disabled"], "reflector.service": ["inactive", "dead", "disabled"],
  "fstrim.timer": ["inactive", "dead", "disabled"], "paccache.timer": ["inactive", "dead", "disabled"]
};
var units = {};
Object.keys(S.servicos).forEach(function (u) {
  var s = S.servicos[u];
  if (s.LoadState === "not-found") { units[u] = { nf: 1 }; return; }
  var e = {
    d: s.Description, ld: s.LoadState, a: s.ActiveState, sub: s.SubState, uf: s.UnitFileState, pr: s.UnitFilePreset,
    fp: s.FragmentPath, pid: +s.MainPID || 0, ty: s.Type, doc: s.Documentation, cg: s.ControlGroup,
    mem: +s.MemoryCurrent || 0, peak: +s.MemoryPeak || 0, cpu: +s.CPUUsageNSec || 0, tasks: +s.TasksCurrent || 0,
    ini: s.ActiveEnterTimestamp, wb: s.WantedBy, trg: s.Triggers, tby: s.TriggeredBy, cat: s.cat
  };
  if (LIMPO[u]) { e.a = LIMPO[u][0]; e.sub = LIMPO[u][1]; e.uf = LIMPO[u][2]; e.pid = 0; e.ini = ""; e.mem = e.peak = e.cpu = e.tasks = 0; }
  // a linha de "status" do processo principal (CGroup)
  var m = /CGroup: .*\n((?:\s+[└├│].*\n?)+)/.exec(s.status || "");
  if (m && !LIMPO[u]) e.cgl = m[1].replace(/\n$/, "").split("\n").map(function (l) { return l.replace(/^\s+/, ""); });
  var inv = /Invocation: (\S+)/.exec(s.status || ""); if (inv && !LIMPO[u]) e.inv = inv[1];
  units[u] = e;
});
// lista de unit files (nome, estado, preset) para list-unit-files
var luf = [];
(S.saidas["list-unit-files"] || "").split("\n").forEach(function (l) {
  var m = /^(\S+)\s+(\S+)\s+(\S+)\s*$/.exec(l);
  if (!m || m[1] === "UNIT") return;
  var st = m[2], pr = m[3];
  if (LIMPO[m[1]]) st = LIMPO[m[1]][2];
  luf.push([m[1], st, pr]);
});
// unidades carregadas (list-units --all): nome, load, active, sub, descrição
var lu = [];
(S.saidas["list-units"] || "").split("\n").forEach(function (l) {
  var m = /^[ ●*]{0,2}(\S+)\s+(loaded|not-found|masked|error)\s+(\S+)\s+(\S+)\s+(.*)$/.exec(l);
  if (!m) return;
  if (/a8|loop0|loop1|teste|session-\d|zram|snapper|run-credentials-systemd\\x2djournald|podman/.test(m[1]) && !/^systemd-journald/.test(m[1])) {
    if (/a8|loop|teste|session-|snapper|zram|podman/.test(m[1])) return;
  }
  lu.push([m[1], m[2], m[3], m[4], m[5]]);
});
var lua = [];
(S.saidas["list-units-service-all"] || "").split("\n").forEach(function (l) {
  var m = /^[ ●*]{0,2}(\S+)\s+(loaded|not-found|masked|error)\s+(\S+)\s+(\S+)\s+(.*)$/.exec(l);
  if (!m || /a8|loop|teste|snapper|zram|podman/.test(m[1])) return;
  var u = m[1];
  if (LIMPO[u]) { m[3] = LIMPO[u][0]; m[4] = LIMPO[u][1]; }
  lua.push([u, m[2], m[3], m[4], m[5]]);
});

/* ---------------- journal (boot atual, só a partida da VM) ---------------- */
var curtas = (S.saidas["journal-b0"] || "").split("\n").filter(function (l) { return /^\d{4}-/.test(l); });
var js = (S.saidas["journal-b0-json"] || "").split("\n").filter(Boolean).map(function (l) { return JSON.parse(l); });
var FIM_BOOT = 1792166811000000; // 13:06:51 (antes dos logins dos autores)
var jr = [], t0 = null;
js.forEach(function (e, i) {
  var t = +e.__REALTIME_TIMESTAMP;
  if (t > FIM_BOOT) return;
  if (t0 === null) t0 = t;
  var host = "notebook", c = curtas[i];
  if (c) { var mm = /^\S+ (\S+) /.exec(c); if (mm) host = mm[1]; }
  var msg = Array.isArray(e.MESSAGE) ? String.fromCharCode.apply(null, e.MESSAGE) : e.MESSAGE;
  // [μs desde o 1º, prioridade, unidade, UNIT, identificador, pid, host, mensagem]
  jr.push([t - t0, +e.PRIORITY, e._SYSTEMD_UNIT || "", e.UNIT || "", e.SYSLOG_IDENTIFIER || e._COMM || "", e._PID ? +e._PID : 0, host === "notebook" ? 0 : host, msg]);
});
var boots = (S.saidas["journal-list-boots"] || "");

/* ---------------- pacman.log (até o fim da instalação das aulas) ---------------- */
var plog = (S.saidas["pacman-log"] || "").split("\n");
var corte = plog.length;
for (var i = 0; i < plog.length; i++) if (/^\[2026-10-16T13:0[6-9]|^\[2026-10-16T13:[1-5]/.test(plog[i])) { corte = i; break; }
plog = plog.slice(0, corte).join("\n") + "\n";

var H = {};
try { H = JSON.parse(fs.readFileSync(path.join(VMDIR, "home.json"), "utf8")); } catch (e) { /* */ }
var dados = {
  v: 1, home: H, gerado: new Date().toISOString().slice(0, 10), t: tabela, pac: pac, fs: fsl, proc: proc,
  sd: { u: units, luf: luf, lu: lu, lua: lua, boots: boots }, jr: { t0: t0, l: jr }, plog: plog
};
var json = JSON.stringify(dados);
var gz = zlib.gzipSync(Buffer.from(json, "utf8"), { level: 9 });
var b64 = gz.toString("base64");
var saida = "/* Guia Arch — dados reais da VM arch-guia para o simulador (assets/bashsim.js).\n" +
  "   Gerado por tools/gerar-dados.js em " + dados.gerado + " (" + Object.keys(local).length + " pacotes instalados, " +
  Object.keys(repo).length + " do repositório). JSON comprimido (gzip + base64). Não edite à mão. */\n" +
  "(function (g) {\n  var d = \"" + b64.replace(/(.{1000})/g, "$1\\\n") + "\";\n" +
  "  if (typeof module !== \"undefined\" && module.exports) module.exports = d; else g.ArchSimDadosGz = d;\n" +
  "  if (g.BashSim && g.BashSim.receberDados) g.BashSim.receberDados(d);\n" +
  "})(typeof window !== \"undefined\" ? window : globalThis);\n";
fs.writeFileSync(path.join(RAIZ, "assets", "archsim-dados.js"), saida);
process.stderr.write("assets/archsim-dados.js: " + saida.length + " bytes (JSON " + json.length + ", gzip " + gz.length + ")\n");
