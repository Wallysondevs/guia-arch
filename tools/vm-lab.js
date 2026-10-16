/*
  tools/vm-lab.js — roda casos de teste na VM arch-guia (~/guia-arch-lab/vm), numa só chamada.

  A VM é compartilhada pelos autores, então os casos NUNCA mexem na pasta de verdade da ana:
  - tudo acontece num "mount namespace" privado (unshare -m), criado pelo root;
  - lá dentro, /home/ana é uma cópia (bind de /var/tmp/simdev/home) e /tmp é um tmpfs novo;
  - os comandos rodam como a ana (setpriv --reuid=ana), num shell de login em pt_BR;
  - a cópia é refeita antes de cada caso e apagada no fim. Nada é instalado: as transações
    do pacman são mostradas com "previa" (que responde "não").

  Tipos de caso: "i" = sessão interativa como a ana (formato do pre.term: "$ cmd" + saída),
  "s" = "bash t.sh args" com stdin, "p" = "previa ARGS" (transação real, respondendo não).

  rodarNaVM([{id, tipo, texto, args, stdin, setup}]) → { id: saída }
*/
"use strict";
var cp = require("child_process"), path = require("path");
var VM = path.join(process.env.HOME || "/home/wallyson", "guia-arch-lab", "vm");

var DRIVER = [
  'set +o histexpand',
  'D=/var/tmp/simdev; rm -rf $D; mkdir -p $D/c; chmod 755 $D; cd $D/c; cat > todos',
  // modelo da pasta da ana: a de verdade, sem o que os autores criaram depois (igual ao simulador)
  'cp -a --sparse=always /home/ana $D/modelo',
  'rm -rf $D/modelo/.cache/containers $D/modelo/.cache/flatpak $D/modelo/.cache/mirrorstatus.json $D/modelo/.cache/yay/* $D/modelo/.config/htop $D/modelo/.config/procps $D/modelo/.config/systemd $D/modelo/.config/yay/* $D/modelo/.local/share/* $D/modelo/.ssh/*',
  'find $D/modelo -mindepth 1 -maxdepth 1 ! -name ".*" ! -name aur ! -name Documentos ! -name Downloads ! -name Imagens ! -name Modelos ! -name Música ! -name Público ! -name Vídeos ! -name "Área de trabalho" ! -name frutas.txt -exec rm -rf {} +',
  'find $D/modelo -mindepth 1 -maxdepth 1 -name ".*" ! -name .bash_history ! -name .bashrc ! -name .bash_profile ! -name .bash_logout ! -name .cache ! -name .config ! -name .local ! -name .ssh -exec rm -rf {} +',
  ': > $D/modelo/.bash_history',
  'touch -d "2026-10-16 13:00" $D/modelo/.cache $D/modelo/.local $D/modelo/.cache/yay $D/modelo/.local/share; touch -d "2026-10-16 12:59" $D/modelo/.config $D/modelo/.config/yay; touch -d "2026-10-16 12:11" $D/modelo/.ssh; touch -d "2026-10-16 13:05" $D/modelo/.bash_history; touch -d "2026-10-15 08:47" $D/modelo',
  'mkdir -p $D/home $D/u && chown ana:ana $D/home $D/u && chmod 700 $D/home',
  'awk -v RS="\\x1e" "NR>1{f=\\"$D/c/caso\\" NR-1; printf \\"%s\\", \\$0 > f; close(f)}" $D/c/todos',
  'cat > $D/rc <<"EOF"',
  'source /etc/profile 2>/dev/null',
  '[[ -f ~/.bashrc ]] && source ~/.bashrc',
  "PS1='$ ' PS2='> '",
  'unset PROMPT_COMMAND',
  'EOF',
  'chmod 644 $D/rc',
  'cat > $D/dentro.sh <<"EOF"',
  'D=/var/tmp/simdev',
  'mount --make-rprivate / && mount --bind $D/home /home/ana && mount -t tmpfs -o mode=1777 tmpfs /tmp || { echo "falha ao montar"; exit 1; }',
  // segurança: só apaga se /home/ana for mesmo a cópia
  'seguro() { [ "$(findmnt -n -o SOURCE /home/ana)" != "" ] && findmnt -n -o SOURCE /home/ana | grep -q simdev; }',
  'seguro || { echo "a /home/ana não é a cópia: parando"; exit 1; }',
  'reset_home() { cd /; seguro || exit 1; find /home/ana -mindepth 1 -maxdepth 1 -exec rm -rf {} + ; cp -a --sparse=always $D/modelo/. /home/ana/; touch -r $D/modelo /home/ana; find /tmp -mindepth 1 -maxdepth 1 -exec rm -rf {} + ; cd /home/ana; }',
  'comoana() { setpriv --reuid=1000 --regid=1000 --init-groups env -i HOME=/home/ana USER=ana LOGNAME=ana SHELL=/bin/bash LANG=pt_BR.UTF-8 TERM=xterm-256color MAIL=/var/spool/mail/ana PATH=/usr/local/sbin:/usr/local/bin:/usr/bin:/usr/bin/site_perl:/usr/bin/vendor_perl:/usr/bin/core_perl "$@"; }',
  'for f in $(ls $D/c/caso* | sort -V); do',
  '  reset_home',
  '  read -r cab < "$f"',
  '  id=${cab%% *}; tipo=$(echo "$cab" | cut -d" " -f2)',
  '  tail -n +2 "$f" > $D/c/corpo; chmod 644 $D/c/corpo',
  '  sed -n "/^\\x1c/,\\$p" $D/c/corpo | sed 1d > $D/c/setup; sed -i "/^\\x1c/,\\$d" $D/c/corpo; chmod 644 $D/c/setup',
  '  if [ -s $D/c/setup ]; then (cd /home/ana; comoana bash -c "cd /home/ana; source $D/c/setup" > /dev/null 2>&1 < /dev/null); fi',
  '  printf "\\x1d%s\\n" "$id"',
  '  if [ "$tipo" = i ]; then',
  // o pipe da saída é criado pela própria ana (assim /dev/stdout e /dev/stderr abrem como no terminal)
  '    (cd /home/ana; comoana bash -c "timeout 20 bash --rcfile $D/rc -i < $D/c/corpo 2>&1 | cat") | sed -e "/^bash: impossível definir grupo do processo/d" -e "/^bash: nenhum controle de trabalho neste shell$/d" -e "/tcsetattr: ioctl inapropriado/d" -e "\\${/^\\$ exit\\$/d;/^exit\\$/d}" -e "\\$s/^\\$ \\$//" | head -c 200000',
  '  elif [ "$tipo" = p ]; then',
  '    timeout 120 previa $(cat $D/c/corpo) 2>&1 | head -c 200000; echo "[código de saída: ${PIPESTATUS[0]}]"',
  '  else',
  '    args=$(echo "$cab" | cut -d" " -f3- | sed "s/\\x1f.*//")',
  '    stdin=$(echo "$cab" | sed -n "s/.*\\x1f//p")',
  '    cp $D/c/corpo /home/ana/t.sh; chown ana:ana /home/ana/t.sh',
  '    if [ -n "$stdin" ]; then printf "%b" "$stdin" > $D/c/stdin; else : > $D/c/stdin; fi; chmod 644 $D/c/stdin',
  '    (cd /home/ana; comoana bash -c "timeout 20 bash t.sh $args < $D/c/stdin > $D/u/saida 2>&1; echo \\$? > $D/u/rc"); head -c 200000 $D/u/saida; echo "[código de saída: $(cat $D/u/rc)]"',
  '  fi',
  'done',
  'EOF',
  'unshare -m bash $D/dentro.sh',
  'cd /; rm -rf $D'
].join("\n");

function rodarNaVM(casos, rotulo) {
  if (!casos.length) return {};
  var entrada = casos.map(function (c) {
    var cab = c.id + " " + c.tipo + " " + (c.args || []).join(" ") + (c.stdin != null ? "\x1f" + c.stdin.replace(/\\/g, "\\\\").replace(/\n/g, "\\n") : "");
    return "\x1e" + cab + "\n" + c.texto + (c.setup ? "\x1c\n" + c.setup + "\n" : "");
  }).join("");
  process.stderr.write("VM: rodando " + casos.length + " caso(s) " + (rotulo || "") + " numa só chamada...\n");
  var r = cp.spawnSync("timeout", ["1500", VM, "-u", "root", "bash -c " + citar(DRIVER)], { input: entrada, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw r.error;
  if (r.status !== 0 && !/\x1d/.test(r.stdout || "")) throw new Error("a VM não respondeu (código " + r.status + "): " + (r.stderr || r.stdout || "").slice(0, 500));
  var res = {};
  (r.stdout || "").split("\x1d").slice(1).forEach(function (bloco) { var i = bloco.indexOf("\n"); res[bloco.slice(0, i)] = bloco.slice(i + 1); });
  return res;
}
function citar(s) { return "'" + s.replace(/'/g, "'\\''") + "'"; }

module.exports = { rodarNaVM: rodarNaVM, VM: VM };
