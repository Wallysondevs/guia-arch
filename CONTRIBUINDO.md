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

O Guia Arch usa o mesmo interpretador do Guia Bash (`assets/bashsim.js`), adaptado para uma máquina **Arch**: prompt `[ana@notebook ~]$`, arquivos do Arch, `pacman`, `sudo`, `systemctl`. **Ele está sendo adaptado agora, em paralelo**; o contrato abaixo vale. Quando `tools/testar-missoes.js` existir, teste suas missões com ele.

**O que vai funcionar no simulador (Arch):** tudo o que o simulador do Guia Bash faz (Bash completo, coreutils GNU, grep/sed/awk básicos…) mais:
- `pacman`: `-Q -Qi -Ql -Qo -Qs -Qe -Qm -Qdt -Qu -Ss -Si -S (pergunta [S/n] e "instalação" simulada) -R -Rs -Rns -Syu -Sc -F -Fy`, com dados reais tirados da VM (pacotes instalados e uma parte do repositório);
- `sudo` (senha da ana: `ana`; `[sudo] senha para ana:`), `su`;
- `systemctl status/start/stop/restart/enable/disable/is-active/is-enabled/list-units --type=service/--failed` para os serviços da VM (sshd, NetworkManager, nginx, cronie, systemd-timesyncd…), `journalctl` básico (`-u`, `-b`, `-p`, `-n`, `-f` mostra e para);
- `uname`, `hostnamectl`, `localectl`, `timedatectl`, `lsblk`, `df`, `free`, `ip a`, `uptime`, `cat /etc/os-release`.
**Não vai funcionar:** instalar de verdade, AUR/`makepkg`/`yay` (só em `pre.term`), rede real, editores, reboot, discos de verdade (`fdisk`, `mkfs`, `mount` só em `pre.term`), o ambiente live da instalação.

Metas extras do Guia Arch (além das do Guia Bash): `pkg:NOME` (o pacote está instalado), `nopkg:NOME` (não está), `svc:NOME=active` / `svc:NOME=enabled` (estado de um serviço).

**Máquina fictícia = a VM:** usuária `ana` (grupo `wheel`, `sudo` com senha), máquina `notebook`, Arch Linux (rolling), kernel `7.2.10-arch1-1` (+ `linux-lts` 6.18.57), Bash 5.3.20, `LANG=pt_BR.UTF-8`, fuso America/Sao_Paulo, teclado `br-abnt2`. Disco: `/dev/sda1` EFI 1 GiB em `/boot` (vfat), `/dev/sda2` swap 4 GiB, `/dev/sda3` raiz ext4 25 GiB. GRUB (UEFI). Rede: NetworkManager, `enp0s3`. Pasta `/home/ana` (modo 700) com os mesmos arquivos do Guia Bash: `Área de trabalho/ Documentos/{acesso.log,alunos.csv,notas.txt,relatorio.odt,projetos/} Downloads/{archlinux-x86_64.iso,manual.pdf,foto.jpg,musica.mp3,fotos-viagem.zip} Imagens/ Modelos/ Música/ Público/ Vídeos/ frutas.txt aur/{yay-bin,paru-bin,downgrade}` e `.bashrc` padrão do Arch (`alias ls='ls --color=auto'`, `alias grep='grep --color=auto'`, `PS1='[\u@\h \W]\$ '`).

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
