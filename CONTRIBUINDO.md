# Como escrever uma página do Guia Arch

O guia é uma **escola**, estilo W3Schools, não uma lista de comandos. O leitor é iniciante: nunca mostre um comando "seco", sem antes explicar cada parte, o que ele devolve e o que fazer quando não funciona. Modelos de profundidade: `../guia-debian/apt.html`, `../guia-debian/instalacao.html`, `../guia-bash/aspas.html`. **Todo fato, comando e saída precisa ser do Arch Linux real**, conferido na VM de laboratório (seção 5).

## 1. Esqueleto do arquivo

```html
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Arch TEMA — descrição curta | Guia Arch</title>
<meta name="description" content="Uma frase sobre a página.">
<link rel="stylesheet" href="assets/style.css">
<script>try{var t=localStorage.getItem("tema");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
</head>
<body>
<div class="layout">
<nav class="sidebar" id="sidebar" aria-label="Tópicos"></nav>
<main class="main">
<div class="content">
<div class="pager"></div>
<h1>Arch <span class="hl">TEMA</span></h1>
… conteúdo …
<div class="pager"></div>
</div>
</main>
</div>
<script src="assets/site.js"></script>
</body>
</html>
```

O menu, o selo de nível e Anterior/Próximo vêm de `assets/site.js` (lista `NIVEIS`). **Não mude a `NIVEIS`**; links internos só para páginas que estão nela.

## 2. Ordem de uma aula

1. **Intro** (`p.intro`): o que é e para que serve, em 2–3 frases.
2. **"Você vai aprender"** (`div.note` com lista de 3–5 itens).
3. **Conceito antes do comando** (o que é um pacote, um repositório, uma partição EFI…), com exemplo do dia a dia.
4. **Do simples ao completo**, uma novidade por vez; cada forma nova ganha uma `dl.anatomy`.
5. **Toda saída explicada**, com anotações `«` nas linhas importantes e tabelas para colunas.
6. **O que devolve**: saída + código de saída (`echo $?`), principalmente quando nada aparece.
7. **Formas diferentes de fazer** + tabela "Qual usar?" (ex.: `pacman -Rs` × `-Rns`; GRUB × systemd-boot; yay × paru × makepkg).
8. **Experimente** (`.try`/`.tryscript`) quando o simulador suportar (seção 4).
9. **Quando não funciona** (`div.cenario`): mensagem real → causa → como confirmar → como resolver.
10. **Referência** (`table.ref`).
11. **Exercícios** (3 ou mais: `.exercise` e `.mc`).
12. **Resumo** (lista curta).
13. **"Na Arch Wiki"**: um parágrafo final com os links das páginas da Wiki que aprofundam o tema (o leitor de Arch precisa aprender a usar a Wiki).

## 3. Componentes

### Sessão de terminal (o prompt é o do Arch)
```html
<pre class="term">$ pacman -Q bash
bash 5.3.20-1                « nome e versão-lançamento
$ cd Documentos
$ ls
acesso.log  alunos.csv  notas.txt  projetos  relatorio.odt
#> pacman -Syu
</pre>
```
- `$ ` vira `[ana@notebook ~]$` — o prompt padrão do Arch (`PS1='[\u@\h \W]\$ '`): entre colchetes, só o **nome** da pasta atual (`[ana@notebook Documentos]$`). `#> ` vira `[root@notebook ~]#`.
- `> ` logo depois de um comando = linha de continuação. `«` = anotação (não é copiada).
- O prompt acompanha `cd`, `cd -`, `pushd/popd`, aspas e variáveis da sessão; um `cd` seguido de `bash: cd: …` não muda a pasta.
- `data-cwd="~/aur"`, `data-user="root"`, `data-title`. **Ambiente live:** `data-host="archiso" data-user="root"` com `#> ` desenha o prompt real do zsh do live (`root@archiso ~ #`, caminho completo). **Dentro do `arch-chroot`:** acrescente `data-cwd="/"` e o prompt vira o do Bash (`[root@archiso /]#`). `data-shell="zsh|bash"` força um dos dois.
- Dentro de `<pre>`: `&lt; &gt; &amp;`. Uma linha de saída que começa com `$` **sem espaço** (`$HOME`) é saída.
- `pre.file data-file="/etc/pacman.conf"` mostra arquivos.

### Imagens reais da VM
`img/live-boot.png` (tela do ambiente live) e `img/primeiro-boot-login.png` (login no primeiro boot). Use `<figure><img src="img/…" alt="…" loading="lazy"><figcaption>…</figcaption></figure>`. Para capturar outras telas: `VBoxManage controlvm arch-guia screenshotpng ~/guia-arch/img/NOME.png` (só o coordenador; peça no relatório).

### Missões, anatomia, blocos
Iguais aos do Guia Bash (veja `../guia-bash/CONTRIBUINDO.md`, seção 3): `dl.anatomy`, `.try` (com `data-setup`, `data-goal`, `data-solucao` **obrigatório**), `.tryscript` (com `pre.script` e `pre.solucao`), `div.note/.tip/.warning/.cenario`, `ol.passo`, `table.ref`, `.exercise`, `.mc`.

## 4. O simulador (Arch)

O Guia Arch usa o interpretador do Guia Bash (`assets/bashsim.js`), adaptado para a máquina **Arch** da VM: prompt `[ana@notebook ~]$`, arquivos e versões do Arch, `sudo`/`su`, `pacman`, `systemctl`, `journalctl`. Os dados reais da VM (pacotes, `/etc`, `/usr/bin`, serviços, journal, `pacman.log`) ficam em `assets/archsim-dados.js`, carregado junto com o simulador (os terminais só aparecem depois que ele chega). **Teste suas missões com `node tools/testar-missoes.js pagina.html`.**

**O que funciona:** tudo o que o simulador do Guia Bash faz (Bash completo, coreutils GNU, grep, sed, find…), com o `awk` do Arch (**gawk** 5.4: conta caracteres, não bytes; número sempre com ponto: `9.5`, nunca `9,5`, salvo com `--use-lc-numeric`; o `for (k in a)` sai na mesma ordem do gawk real), mais:
- `sudo` (senha `ana`; `[sudo] senha para ana: `; no primeiro uso da sessão aparece o "sermão" em pt_BR; lembra a senha por 5 minutos; senha errada: `Sinto muito, tente novamente.`, e depois de 3 erros `sudo: 3 tentativas de senha incorreta` e o faillock recusa até a senha certa por 10 minutos), `sudo -i`, `sudo -s`, `sudo su`, `sudo -k`, `sudo -l`, `su`/`su -` (senha do root: `rootlab`; abre um shell `[root@notebook ~]#`, e `exit` volta para a ana), `visudo` (falha como no real: não há `vi`).
- `pacman`: `-Q -Qi -Ql -Qo -Qs -Qe -Qd -Qm -Qn -Qt -Qdt -Qu -Qk -Qkk -Qg -Qq`, `-S` (resolve as dependências, perguntas de provedor e de grupo, `[S/n]`, download e instalação com as mensagens reais, hooks, `Dependências opcionais`; muda o estado: a meta `pkg:` passa a valer e o programa aparece em `/usr/bin`), `--needed`, `--noconfirm`, `-Ss -Si -Sg -Sl -Sc -Scc -Sy -Syu` (o `-Sy` encontra 3 atualizações fictícias: `curl`, `nano` e `tzdata`), `-R -Rs -Rns -Rc -Rdd` (com `verificando dependências...`, quebras de dependência e `requer opcionalmente`), `-D --asdeps/--asexplicit`, `-T`, `-F -Fl -Fy`. Mensagens reais (`erro: você não pode realizar esta operação a menos que seja root.`, `erro: alvo não encontrado: x`, `erro: o pacote "x" não foi encontrado`), em inglês com `LC_ALL=C`.
- `systemctl status/start/stop/restart/reload/enable/disable (--now)/mask/unmask/is-active/is-enabled/is-failed/cat/list-units (--type, --all, --state)/--failed/list-unit-files/list-timers/daemon-reload/get-default` para as unidades da VM; sem root, o polkit pede a senha da ana no terminal (`==== AUTHENTICATING FOR …`). `journalctl -u -b -p -n -e -f -r -k -t -g --since --until --list-boots -o short-iso/cat` com as linhas reais do boot da VM e as que o simulador acrescenta (start/stop de serviços); a ana está no `wheel`, então vê o journal do sistema sem o aviso "Hint: You are currently not seeing messages…" (esse aviso só aparece para quem não está em `wheel`, `adm` ou `systemd-journal`).
- `uname`, `hostname` (o do **inetutils**: `-i` dá `10.0.2.15`, `-I` é opção inválida), `hostnamectl`, `localectl`, `timedatectl` (NTP **inativo**, como na VM), `lsblk` (`-f`, `-o`, um disco), `findmnt`, `df`, `free`, `ip a/link/r` (`-br`) e `ip route get`, `uptime`, `w`, `who`, `id`, `groups`, `getent` (`hosts`/`ahosts` só para `localhost`, `notebook`, `archlinux.org`, `aur.`/`wiki.archlinux.org`, `google.com`, `github.com`), `sysctl`, `blkid` (sem root: vazio, código 0), `paru` (quebrado como na VM: `libalpm.so.15`), `locale` (`-a`, `-k`, `-c`, as palavras-chave mais usadas), `/dev/sda*` (dispositivos de bloco, grupo `disk`), `/proc/self/fd`.
- `tar` (`-c/-x/-t`, `-v`, `-z/-J/-j/--zstd/-a`, `-C`, `-O`, `--exclude`, membros escolhidos; lista os pacotes do cache, `.PKGINFO` incluído), `gzip/gunzip/zcat`, `xz/unxz/xzcat`, `zstd/unzstd/zstdcat`, `bzip2`, `zgrep`, `file` (gzip, XZ, Zstandard, tar, ELF dos programas de `/usr/bin` com o BuildID real), `tree`, `rename` (o do util-linux: `rename de para arquivos`), `gio trash` (sem gvfs, como na VM: `--list`/`--restore` dão `Operação sem suporte`), `crontab` (`-l`, `-r`, `crontab arquivo`, com as mensagens do cronie), `sudoedit` (pede a senha; não abre editor), `chown`/`chgrp` com os usuários e grupos da VM, `kill -STOP/-CONT`, `pkill -e`, `killall -v/-i`, `ps -o … --sort`.

**Não funciona** (o simulador avisa com uma linha `(simulador) …`; use `pre.term` com a saída real da VM): instalar de verdade, AUR (`yay`, `makepkg`), rede (`ping`, `curl`, `git clone`), editores (`nano`, `vim`), `man`, discos (`fdisk`, `mkfs`, `mount`, `cryptsetup`, `btrfs`), `mkinitcpio`, `grub-*`, `reboot`, o ambiente live, `systemctl --user`. Dos boots anteriores (`journalctl -b -1` … `-b -7`, como em `journalctl --list-boots`) só existem as últimas 60 linhas reais de cada um. O repositório simulado é uma **parte** do real: os pacotes instalados e os que as aulas instalam (firefox, vlc, gimp, fastfetch, git, docker, gnome, plasma-meta, xfce4…, com as dependências). O `-Sl` tem a lista completa de nomes e versões, mas `-Ss`/`-Si`/`-S` só conhecem essa parte (fora dela: `(simulador) o pacote x existe no repositório, mas não faz parte…`).

**Metas extras:** `pkg:NOME` (o pacote está instalado), `nopkg:NOME` (não está), `svc:NOME=active|inactive|failed` (estado agora) e `svc:NOME=enabled|disabled|static|masked` (estado no boot). `NOME` sem sufixo vale como `.service`.

**Senhas e respostas nas missões (`data-stdin`):** no navegador o leitor digita a senha e as respostas. Para o teste automático e para o botão "Rodar solução", ponha em `data-stdin` o que seria digitado, uma resposta por linha, separadas por `\n`, na ordem em que são pedidas: `data-solucao="sudo pacman -S fastfetch" data-stdin="ana\nS"` (senha do sudo, depois o `[S/n]`). Lembre que o sudo guarda a senha por 5 minutos: um segundo `sudo` na mesma solução não pede de novo. O **`data-setup` roda sem pedir senha** (sudo e polkit passam direto, e o sudo não fica "lembrado"): `data-setup="sudo systemctl start nginx"` funciona sem `data-stdin`.

**Máquina fictícia = a VM (snapshot pronto-para-aulas):** usuária `ana` (uid 1000, grupos `ana wheel`), root (senha `rootlab`), máquina `notebook`, Arch Linux, kernel `7.2.10-arch1-1` (+ `linux-lts` 6.18.57-1), Bash 5.3.20, gawk 5.4.1, coreutils 9.12, pacman 7.1.0 (libalpm 16.0.1), systemd 262, `LANG=pt_BR.UTF-8`, fuso America/Sao_Paulo, teclado `br-abnt2`, **relógio fixo em sex 16/10/2026 14:30** (a VM ligou às 13:06). Disco: `/dev/sda1` EFI 1 GiB em `/boot` (vfat), `/dev/sda2` swap 4 GiB, `/dev/sda3` raiz ext4 25 GiB (`df -h /`: `25G 4,9G 19G 22%`). Serviços: `sshd`, `NetworkManager` e `getty@tty1` ligados; `nginx`, `cronie`, `podman.socket`, `fstrim.timer`, `systemd-timesyncd`, `snapper-*` desligados. Pasta `/home/ana` (modo 700): `Área de trabalho/ Documentos/{acesso.log,alunos.csv,notas.txt,relatorio.odt,projetos/} Downloads/{archlinux-x86_64.iso,manual.pdf,foto.jpg,musica.mp3,fotos-viagem.zip} Imagens/{ferias.jpg,perfil.png} Modelos/ Música/ Público/ Vídeos/ frutas.txt aur/{yay-bin,paru-bin,downgrade}/` e `.bashrc`, `.bash_profile`, `.bash_logout` do Arch (só os aliases `ls` e `grep`; **sem** `ll`, sem `HISTCONTROL`). `pacman -Qm`: `downgrade paru-bin yay-bin yay-bin-debug`. `pacman -Qdt`: vazio (código 1).

**Ferramentas:**
- `node tools/testar-missoes.js [pagina.html…]`: para cada `.try`, roda `data-setup` → confere que a meta ainda não vale → digita `data-solucao` (com `data-stdin`) → confere a meta; para cada `.tryscript`, idem, e compara a saída da solução com a **VM** (como a ana, numa cópia da pasta dela; nada muda na VM). `--sem-vm` pula a comparação.
- `node tools/sim.js 'cmd1' 'cmd2'` mostra a sessão no formato do `pre.term` (`--sem-tty` imita o `vm -i`; `--root` começa como root; `--stdin 'ana\nS\n'` dá as respostas; `--setup 'a;;b'`; `--script arq.sh args`).
- `node tools/testes/rodar.js [filtro] [--diff]`: bateria diferencial simulador × VM (`tools/testes/*.casos`; o tipo `[previa]` compara uma transação do pacman com o `previa` real). `--real` e `--sim` mostram a saída crua da VM ou do simulador dos casos do filtro (bom para conferir uma saída real antes de corrigir o simulador).
- `node tools/gerar-dados.js [--extrair]`: refaz `assets/archsim-dados.js` a partir da VM (só leitura).

**Limitações conhecidas:** o tamanho dos arquivos compactados (`gzip`, `xz`, `zstd`, `bzip2`, `tar -z`…) é uma **estimativa** (o do `.tar` puro é exato): não copie esses números para o `pre.term`; a ordem em que `tar -c`, `cp -r`, `chmod -R`, `find` listam arquivos **criados na sessão** é a de criação (no Arch real é a do hash do diretório, imprevisível); `crontab -e`, `gio trash --restore` e o editor do `sudoedit` não existem; PIDs, inodes e números de memória/CPU são fictícios; as barras de download do pacman são aproximadas; os hooks do pacman mostram só a descrição (sem a saída dos scripts); o `-Ql` só existe para os pacotes que as aulas usam; `bash-completion` não está carregado; o título da janela (`PROMPT_COMMAND` do `/etc/bash.bashrc`) não é simulado.

## 5. Fidelidade: a VM de laboratório (`~/guia-arch-lab/vm`)

Existe uma VM Arch Linux real (VirtualBox, `arch-guia`), instalada à mão seguindo a Arch Wiki. **Confira nela toda saída que você publicar.**

```bash
V=~/guia-arch-lab/vm
$V 'pacman -Qi bash'                    # como ana, num shell de login (pt_BR)
$V -u root 'pacman -Syu'                # NÃO! veja as regras abaixo
printf '%s\n' 'cd Documentos' 'ls -l' | $V -i            # sessão no formato do pre.term ($ / >)
printf '%s\n' 'pacman -Qdt' | $V -u root -i              # idem como root (#> )
$V -t 'sudo pacman -Qk bash'            # terminal de verdade (cores, colunas, perguntas do sudo)
$V -u root 'previa -S firefox'          # resumo REAL de uma transação, respondendo "não": nada é instalado
$V -u root 'previa -Rns htop'           # idem para remoção
```

**Saídas já gravadas (use-as!):** `~/guia-arch-lab/instalacao/` tem a instalação manual completa, comando a comando, com a saída real: `01-live` (ambiente live: UEFI, teclado, rede, relógio), `02-particionar` (fdisk GPT: EFI 1G + swap 4G + raiz), `03-formatar`, `04-pacstrap` (reflector com avisos reais de tempo esgotado, `pacstrap -K` com 193 pacotes/765 MiB), `05-configurar` (genfstab, fuso, locale, mkinitcpio), `06-usuarios` (useradd, wheel, visudo), `07-bootloader` (grub-install, grub-mkconfig, efibootmgr), `08-servicos`, `09-primeiro-boot`, `10-pacotes-aulas` (inclui o erro real `não foi possível travar a base de dados` causado por um desligamento forçado e a remoção de `db.lck`), `11-ajustes` (`fsck.fat` só existe com `dosfstools`; `grub-mkconfig` achando dois kernels), `12-aur` (git clone + makepkg do yay-bin/paru-bin/downgrade, incluindo `Dependências faltando: fzf`), `13-flatpak` (atenção: o `remote-add` desse log **não fez nada** — o pacote `flatpak` já traz o Flathub do **sistema** em `/usr/share/flatpak/remotes.d/flathub.flatpakrepo`; o que não vem é o Flathub do **usuário**: `flatpak install --user` → `erro: Nenhuma ref de remoto localizada para “flathub”`), `14-kernels` (depois de instalar `linux-lts`, o GRUB passou a iniciar o **LTS** por padrão; corrigido com `GRUB_TOP_LEVEL="/boot/vmlinuz-linux"`). O ambiente live fala **inglês**; o sistema instalado, pt_BR (o GRUB mistura pt_PT e inglês: "A adicionar entrada de menu…", "arranque").

**Regras do laboratório (a VM é compartilhada por vários autores ao mesmo tempo):**
- **Nada de instalar, remover ou atualizar pacotes de verdade** (`pacman -S/-R/-U/-Syu`, `yay -S`, `makepkg -i`). Tudo o que as aulas usam já está instalado. Para mostrar uma instalação/remoção/atualização, use `previa` (saída real, sem efeito) ou os logs da pasta `instalacao/`. Se faltar algum pacote, anote no relatório final.
- **Nunca** corte o SSH nem a rede, nem reinicie/desligue a VM, nem mexa de verdade em `/etc/fstab`, GRUB, `/boot`, `mkinitcpio.conf`, `sshd_config`, NetworkManager, firewall (ligar `ufw`/nftables sem liberar a 22 derruba todos). Para esses temas, trabalhe em cópias (`/tmp/SEUNOME/fstab`) ou mostre os logs.
- Discos/partições/Btrfs/LVM/LUKS: **só em arquivos-imagem** (`truncate -s 2G /var/tmp/SEUNOME/disco.img` + `losetup -f --show`), e desfaça tudo no fim (`umount`, `cryptsetup close`, `vgremove`, `losetup -d`, apague as imagens).
- Serviços: pode `start/stop/enable/disable` só de `nginx`, `cronie`, `podman.socket`, `snapper-*.timer`, `systemd-zram-setup@zram0`… e **volte ao estado original** no fim (anote o estado antes). Nunca mexa em `sshd`, `NetworkManager`, `systemd-*` do sistema.
- Usuários de teste: crie com o seu nome (`teste-SEUNOME`) e remova no fim. Não altere `ana` nem `root` (nem senhas).
- Seus arquivos: `/tmp/SEUNOME/`, `/var/tmp/SEUNOME/` ou `/home/ana/SEUNOME/`. Apague no fim.
- Use `timeout` em tudo (`timeout 120 ~/guia-arch-lab/vm …`). Um comando pesado por vez.
- Se algo quebrar, **pare e relate** (há snapshots `instalacao-base` e `pronto-para-aulas` para restaurar).

**Fatos já conferidos na VM:**

| Ponto | No Arch real |
| --- | --- |
| Prompt | `[ana@notebook ~]$` (`PS1='[\u@\h \W]\$ '`); root: `[root@notebook ~]#`; no live: `root@archiso ~ #` (zsh) |
| `ls -l` | data com o **dia antes do mês**: `15 out 08:47`, `10 out 21:14` |
| Mensagens | pt_BR (`bash: xyz: comando não encontrado`, `sudo: uma senha é necessária`); pacman em pt_BR (`Tamanho total download:`, `:: Continuar a instalação? [S/n]`, `erro: o pacote "x" não foi encontrado`) |
| Versões | kernel 7.2.10-arch1-1, linux-lts 6.18.57-1, bash 5.3.20, pacman 7.1.0 (libalpm 16.0.1), GRUB (UEFI), yay 13.0.1, paru 2.1.0 |
| Base | `base` não traz editor, `sudo`, `man`, `fsck.fat` (dosfstools), `hostname` (inetutils): cada um é um pacote à parte |
| Home | `useradd -m` cria a pasta com modo **700** e `.bashrc`, `.bash_profile`, `.bash_logout` |
| AUR -bin | o `paru-bin` 2.1.0 da VM está **quebrado**: `paru --version` → `error while loading shared libraries: libalpm.so.15` (o pacman 7.1 traz `libalpm.so.16`); exemplo real de pacote `-bin` desatualizado frente a uma atualização da biblioteca. `yay-bin` 13.0.1 funciona |
| AUR × repositório | `yay -Si pfetch` falha porque `extra/pfetch-rs` declara `provides=pfetch`; para o do AUR escreva `aur/pfetch` |
| base-devel | não é mais grupo (`pacman -Sg base-devel` dá erro): é um meta-pacote |
| NTP | **desligado** depois da instalação (`timedatectl`: `System clock synchronized: no`, `NTP service: inactive`); liga-se com `timedatectl set-ntp true` (systemd-timesyncd) |
| GRUB | com dois kernels, o padrão vira o que vier primeiro na ordem (o **LTS**); `GRUB_TOP_LEVEL` resolve; o pacman **não** roda `grub-mkconfig` sozinho |

## 6. Escrita

- Português do Brasil, frases curtas, um assunto por parágrafo. Fale com o leitor ("você").
- Explique a origem dos nomes (`pacman` = *package manager*; `-S` = *sync*; `-R` = *remove*; `-Q` = *query*; AUR = *Arch User Repository*).
- O Arch muda toda semana: escreva o que é estável (conceitos, comandos) e marque o que é data/versão ("em outubro de 2026, …").
- Sempre que algo for perigoso (particionar, `rm`, `pacman -Rdd`, atualização parcial `-Sy pacote`), use `div.warning` e explique o porquê.
- Termo novo → explique na hora ou link para `glossario.html`.
