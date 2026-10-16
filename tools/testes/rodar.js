#!/usr/bin/env node
/*
  tools/testes/rodar.js — testes diferenciais do simulador.

  Cada caso (arquivos tools/testes/*.casos) roda no simulador e na VM Arch real
  (~/guia-arch-lab/vm, como a ana, numa cópia da pasta dela: veja tools/vm-lab.js), e as saídas são comparadas.

  Formato dos arquivos .casos:
      ### nome-do-caso            sessão interativa (como "lab -i": $ / >, stderr junto)
      linhas digitadas…
      ### nome-do-caso [script]   o corpo vira t.sh e roda "bash t.sh" (stdout+stderr e código)
      ### nome [script args="a b" stdin="x\ny"]
  Linhas começando com "#!" dentro de um caso fazem parte dele; "##" no início é comentário.

  Uso:
    node tools/testes/rodar.js                 # todos os casos (usa o cache do VM)
    node tools/testes/rodar.js expansoes       # só os arquivos/casos cujo nome contém "expansoes"
    node tools/testes/rodar.js --vm            # força rodar de novo no VM (ignora o cache)
    node tools/testes/rodar.js --diff          # mostra o diff de cada caso diferente
    node tools/testes/rodar.js --lista         # lista os casos diferentes (sem diff)
    node tools/testes/rodar.js caso --real     # mostra a saída da VM (crua) de cada caso do filtro
    node tools/testes/rodar.js caso --sim      # mostra a saída do simulador de cada caso do filtro

  O VM é chamado UMA vez, com todos os casos que faltam no cache (um processo, com
  timeout), para não pesar na máquina. O cache fica em tools/testes/.cache-lab.json.
  Tipos: [sessao] (padrão), [script args="…" stdin="…"] e [previa] (o corpo são as opções do pacman:
  "-S htop"; na VM roda "previa -S htop" como root; no simulador, "pacman -S htop" como root respondendo n).
*/
"use strict";
var fs = require("fs"), path = require("path"), cp = require("child_process"), crypto = require("crypto");
var sim = require(path.join(__dirname, "..", "sim.js"));
var DIR = __dirname, CACHE = path.join(DIR, ".cache-lab.json");
var vmlab = require(path.join(__dirname, "..", "vm-lab.js"));

function lerCasos(filtro) {
  var casos = [];
  fs.readdirSync(DIR).filter(function (f) { return /\.casos$/.test(f); }).sort().forEach(function (f) {
    var txt = fs.readFileSync(path.join(DIR, f), "utf8"), atual = null;
    txt.split("\n").forEach(function (l) {
      var m = /^### (\S+)(?:\s+\[(script|sessao|previa)([^\]]*)\])?\s*$/.exec(l);
      if (m) {
        atual = { arq: f.replace(/\.casos$/, ""), nome: m[1], tipo: m[2] === "script" ? "s" : m[2] === "previa" ? "p" : "i", linhas: [], args: [], stdin: null };
        var extra = m[3] || "", ma;
        if ((ma = /args="([^"]*)"/.exec(extra))) atual.args = ma[1] ? ma[1].split(" ") : [];
        if ((ma = /stdin="([^"]*)"/.exec(extra))) atual.stdin = ma[1].replace(/\\n/g, "\n");
        casos.push(atual); return;
      }
      if (!atual) return;
      if (/^##(?!#)/.test(l) && atual.tipo === "i") return;
      atual.linhas.push(l);
    });
  });
  casos.forEach(function (c) {
    while (c.linhas.length && c.linhas[c.linhas.length - 1] === "") c.linhas.pop();
    c.texto = c.linhas.join("\n") + "\n";
    c.id = crypto.createHash("sha1").update(c.tipo + "\0" + c.texto + "\0" + c.args.join(" ") + "\0" + (c.stdin || "")).digest("hex").slice(0, 16);
  });
  if (filtro) casos = casos.filter(function (c) { return (c.arq + "/" + c.nome).indexOf(filtro) >= 0; });
  return casos;
}

function rodarLab(casos) {
  return vmlab.rodarNaVM(casos.map(function (c) { return { id: c.id, tipo: c.tipo, texto: c.texto, args: c.args, stdin: c.stdin }; }), "de teste");
}

function rodarSim(c) {
  if (c.tipo === "p") {
    // a transação real (previa, como root num terminal) × o simulador como root, respondendo "n"
    var lin = ["pacman " + c.texto.trim()], resp = [];
    for (var q = 0; q < 20; q++) resp.push("");
    var rr = sim.rodarSessao(lin, { tty: true, root: true, entrada: function (req) { var pr = (req && req.req && req.req.prompt) || ""; return /\[S\/n\]|\[s\/N\]|Continuar|remover/.test(pr) ? "n" : ""; } });
    var tt = rr.texto.replace(/^[^\n]*\n/, "").replace(/#> exit\n$/, "");
    return tt + "[código de saída: " + rr.sessao.sh.status + "]\n";
  }
  if (c.tipo === "i") {
    var r = sim.rodarSessao(c.texto.replace(/\n$/, "").split("\n"), { tty: false });
    var t = r.texto;
    // o lab apaga um "$ " final (prompt vazio)
    return t;
  }
  var rs = sim.rodarScript(c.texto, "t.sh", c.args, { tty: false, stdin: c.stdin === null ? "" : c.stdin });
  return rs.texto + "[código de saída: " + rs.status + "]\n";
}

// normalizações que não são diferenças reais (PIDs, horários do relógio de verdade…)
function normalizar(s, real, ehReal) {
  // o previa às vezes corta um caractere UTF-8 ao meio (U+FFFD): compara sem os não-ASCII
  if (/\uFFFD/.test(real || "")) s = s.replace(/[^\x00-\x7f]+/g, "?");
  // PIDs de jobs ("[1] 12345") variam no Bash real; no previa (terminal), as respostas digitadas aparecem
  return s.replace(/\r/g, "").replace(/^\[(\d+)\] \d+$/gm, "[$1] PID").replace(ehReal ? /(\[[Ss]\/[Nn]\] )n?\n/g : /$^/, "$1").replace(/(\(padrão=[^)]*\): )\n/g, "$1").replace(/(\[S\/n\] )\[código/g, "$1\n[código");
}

function diff(a, b) {
  var la = a.split("\n"), lb = b.split("\n"), out = [], n = Math.max(la.length, lb.length);
  for (var i = 0; i < n; i++) {
    if (la[i] === lb[i]) { out.push("  " + (la[i] === undefined ? "" : la[i])); continue; }
    if (la[i] !== undefined) out.push("\x1b[31m- " + la[i] + "\x1b[0m");
    if (lb[i] !== undefined) out.push("\x1b[32m+ " + lb[i] + "\x1b[0m");
  }
  return out.join("\n");
}

function main(argv) {
  var forcar = argv.indexOf("--vm") >= 0 || argv.indexOf("--lab") >= 0, mostrarDiff = argv.indexOf("--diff") >= 0, lista = argv.indexOf("--lista") >= 0;
  var filtro = argv.filter(function (a) { return a[0] !== "-"; })[0];
  var casos = lerCasos(filtro);
  var cache = {};
  try { cache = JSON.parse(fs.readFileSync(CACHE, "utf8")); } catch (e) { /* sem cache */ }
  var faltam = casos.filter(function (c) { return forcar || cache[c.id] === undefined; });
  if (faltam.length) {
    var novos = rodarLab(faltam);
    Object.keys(novos).forEach(function (k) { cache[k] = novos[k]; });
    // limpa entradas que não existem mais
    var todosIds = {}; lerCasos().forEach(function (c) { todosIds[c.id] = 1; });
    Object.keys(cache).forEach(function (k) { if (!todosIds[k]) delete cache[k]; });
    fs.writeFileSync(CACHE, JSON.stringify(cache, null, 0));
  }
  var iguais = 0, difs = [], mostrar = argv.indexOf("--real") >= 0 ? "real" : argv.indexOf("--sim") >= 0 ? "sim" : null;
  if (mostrar) {
    casos.forEach(function (c) { console.log("### " + c.arq + "/" + c.nome + " (" + (mostrar === "real" ? "VM" : "simulador") + ")"); console.log(mostrar === "real" ? cache[c.id] : rodarSim(c)); });
    return 0;
  }
  casos.forEach(function (c) {
    var real = cache[c.id];
    if (real === undefined) { difs.push({ c: c, real: "(sem resultado do VM)", sim: "" }); return; }
    var s;
    try { s = rodarSim(c); } catch (e) { s = "(exceção no simulador) " + (e && e.stack || e); }
    var r0 = real; real = normalizar(real, r0, true); s = normalizar(s, r0, false);
    if (real === s) iguais++; else difs.push({ c: c, real: real, sim: s });
  });
  difs.forEach(function (d) {
    console.log("✗ " + d.c.arq + "/" + d.c.nome);
    if (mostrarDiff && !lista) console.log(diff(d.real, d.sim) + "\n");
  });
  var pct = casos.length ? (100 * iguais / casos.length).toFixed(1) : "0";
  console.log("\n" + iguais + " de " + casos.length + " casos idênticos (" + pct + "%)" + (mostrarDiff || lista ? "" : "  — use --diff para ver as diferenças"));
  return difs.length ? 1 : 0;
}
if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { lerCasos: lerCasos };
