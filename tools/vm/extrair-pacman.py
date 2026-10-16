#!/usr/bin/python3
# tools/vm/extrair-pacman.py — roda NA VM (como ana, só leitura) e imprime um JSON com os
# dados reais do pacman usados pelo simulador. Chamado por tools/gerar-dados.js:
#     ~/guia-arch-lab/vm 'python3 -' < tools/vm/extrair-pacman.py > tools/vm/pacman.json
# Não instala nada, não trava a base (pacman -Sp é só leitura), não varre o disco.
import json, subprocess, os, re, sys

os.environ["LC_ALL"] = "C"
os.environ["LANG"] = "C"

def run(args, ok_fail=False):
    r = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if r.returncode != 0 and not ok_fail:
        sys.stderr.write("falhou: %s\n%s\n" % (" ".join(args), r.stderr))
    return r.stdout

# Programas que as aulas instalam (ou tentam instalar) — parte do repositório no simulador
ALVOS = """firefox chromium thunderbird vlc mpv gimp inkscape libreoffice-fresh obs-studio audacity
transmission-gtk qbittorrent keepassxc fastfetch btop htop tree git docker docker-compose podman
nodejs npm python-pip python go rust jdk-openjdk cmake neovim vim emacs zsh fish tmux screen wget curl
openssh nginx apache mariadb postgresql sqlite redis ufw firewalld fail2ban cups bluez bluez-utils
pipewire wireplumber pipewire-pulse networkmanager gnome plasma-meta xfce4 xfce4-goodies xorg-server
sddm gdm lightdm i3-wm sway alacritty kitty ttf-dejavu noto-fonts noto-fonts-emoji nvidia-open mesa
amd-ucode intel-ucode linux linux-lts linux-zen linux-headers flatpak reflector pacman-contrib base-devel
man-db man-pages tldr bat eza fd ripgrep fzf jq unzip zip p7zip rsync timeshift snapper grub efibootmgr
os-prober ntfs-3g exfatprogs dosfstools gparted cronie lsof strace nmap tcpdump inetutils bind
net-tools traceroute whois iperf3 qemu-full virt-manager code nano micro helix ranger mc ncdu duf
github-cli yt-dlp ffmpeg imagemagick pandoc okular evince dolphin konsole nautilus gnome-terminal
expac pkgfile cowsony cowsay sl figlet lolcat cmatrix neofetch yay paru steam discord telegram-desktop
spotify-launcher hyprland waybar rofi dunst xdg-user-dirs smartmontools hdparm usbutils pciutils
dmidecode lshw inxi hwinfo plocate mlocate less which sudo doas polkit zram-generator btrfs-progs
lvm2 cryptsetup e2fsprogs xfsprogs mtools parted gptfdisk arch-install-scripts archinstall
""".split()

GRUPOS = ["gnome", "gnome-extra", "plasma", "xfce4", "xfce4-goodies", "xorg", "base-devel"]

def parse_info(txt):
    """Analisa a saída de pacman -Qi / -Si (LC_ALL=C)."""
    pkgs = []
    for bloco in txt.strip("\n").split("\n\n"):
        d, chave = {}, None
        for l in bloco.split("\n"):
            m = re.match(r"^([A-Za-z][A-Za-z .]*?)\s*: (.*)$", l)
            if m and not l.startswith(" "):
                chave = m.group(1).strip(); d[chave] = m.group(2)
            elif chave:
                d[chave] += "\n" + l.strip()
        if d.get("Name"):
            pkgs.append(d)
    return pkgs

def lista(v):
    if v is None or v == "None":
        return []
    return [x for x in re.split(r"  +", v.strip()) if x]

def optdeps(v):
    if v is None or v == "None":
        return []
    r = []
    for l in v.split("\n"):
        l = l.strip()
        l = re.sub(r" \[(installed|pending)\]$", "", l)
        if l:
            r.append(l)
    return r

def compacto(d, local):
    p = {
        "v": d["Version"], "d": d.get("Description", ""), "a": d.get("Architecture", ""),
        "u": d.get("URL", ""), "l": lista(d.get("Licenses")), "g": lista(d.get("Groups")),
        "p": lista(d.get("Provides")), "D": lista(d.get("Depends On")), "o": optdeps(d.get("Optional Deps")),
        "c": lista(d.get("Conflicts With")), "r": lista(d.get("Replaces")), "k": d.get("Packager", ""),
    }
    if local:
        p["e"] = 1 if d.get("Install Reason", "").startswith("Explicitly") else 0
        p["s"] = 1 if d.get("Install Script") == "Yes" else 0
        p["V"] = d.get("Validated By", "")
    else:
        p["V"] = d.get("Validated By", "")
    return p

saida = {}
# ---- pacotes instalados ----
local = {}
for d in parse_info(run(["pacman", "-Qi"])):
    local[d["Name"]] = compacto(d, True)
for l in run(["expac", "-Q", "--timefmt=%s", "%n\t%m\t%b\t%l"]).splitlines():
    n, m, b, i = l.split("\t")
    local[n]["m"] = int(m); local[n]["b"] = int(b); local[n]["i"] = int(i)
saida["local"] = local

# ---- repositório: alvos + o que eles puxam (resolução feita aqui, como o pacman faria) ----
sync = {}      # nome -> (repo, deps, provides)
ordem = []
for l in run(["expac", "-S", "%r\t%n\t%D\t%P"]).splitlines():
    rr, n, dd, pp = (l.split("\t") + ["", ""])[:4]
    if n in sync:
        continue
    sync[n] = (rr, [x for x in dd.split("  ") if x], [x for x in pp.split("  ") if x])
    ordem.append(n)
def nome_dep(s):
    return re.split(r"[<>=]", s, maxsplit=1)[0]
provedores_de = {}
for n in ordem:
    for pv in sync[n][2]:
        provedores_de.setdefault(nome_dep(pv), []).append(n)
instalados_prov = set(local.keys())
for n, p in local.items():
    for pv in p["p"]:
        instalados_prov.add(nome_dep(pv))
def fechar(alvo, acc):
    pilha = [alvo]
    while pilha:
        n = pilha.pop()
        if n in acc:
            continue
        acc.add(n)
        for dep in sync.get(n, ("", [], []))[1]:
            dn = nome_dep(dep)
            if dn in instalados_prov:
                continue
            if dn in sync:
                pilha.append(dn)
            elif dn in provedores_de:
                pilha.extend(provedores_de[dn][:1])
fechamento = set(local.keys())
alvos_ok, alvos_falha = [], []
for a in ALVOS:
    if a in sync:
        alvos_ok.append(a); fechar(a, fechamento)
    else:
        alvos_falha.append(a)
saida["alvos"] = alvos_ok
saida["alvos_inexistentes"] = alvos_falha

grupos = {}
for g in GRUPOS:
    grupos[g] = run(["pacman", "-Sgq", g], True).split()
saida["grupos"] = grupos
for g in grupos.values():
    for n in g:
        fechar(n, fechamento)

repo = {}
nomes = sorted(fechamento)
for i in range(0, len(nomes), 200):
    for d in parse_info(run(["pacman", "-Si"] + nomes[i:i + 200], True)):
        p = compacto(d, False)
        p["R"] = d.get("Repository", "")
        repo[d["Name"]] = p
for i in range(0, len(nomes), 200):
    for l in run(["expac", "-S", "--timefmt=%s", "%r\t%n\t%k\t%m\t%b"] + nomes[i:i + 200], True).splitlines():
        rr, n, k, m, b = l.split("\t")
        if n in repo and repo[n]["R"] == rr:
            repo[n]["k"] = repo[n].get("k")  # empacotador
            repo[n]["K"] = int(k); repo[n]["m"] = int(m); repo[n]["b"] = int(b)
# para os instalados que são iguais ao repositório, guardamos só o que muda
saida["repo"] = repo

# ---- provedores (nomes virtuais usados nas dependências) ----
virtuais = set()
todos = dict(repo); todos.update(local)
for p in todos.values():
    for dep in p["D"]:
        n = nome_dep(dep)
        if n not in sync:
            virtuais.add(n)
    for o in p["o"]:
        n = nome_dep(o.split(":")[0])
        if n not in sync:
            virtuais.add(n)
prov = {}
for v in sorted(virtuais):
    lst = []
    for n in provedores_de.get(v, []):
        for pv in sync[n][2]:
            if nome_dep(pv) == v:
                lst.append([sync[n][0], n, pv])
    prov[v] = lst
saida["provedores"] = prov

# ---- arquivos ----
QL = """bash pacman nano vim htop nginx openssh linux linux-lts coreutils systemd sudo grub tree
networkmanager cronie wget curl git flatpak base filesystem pacman-contrib reflector man-db snapper ufw podman
zram-generator btrfs-progs dosfstools e2fsprogs mkinitcpio intel-ucode yay-bin paru-bin downgrade inetutils less
util-linux iproute2 lvm2 cryptsetup efibootmgr expac fzf jq rsync gawk sed grep findutils procps-ng shadow
pacman-mirrorlist archlinux-keyring linux-firmware-whence systemd-sysvcompat""".split()
arquivos = {}
for n in QL:
    if n in local:
        arquivos[n] = [l.split(" ", 1)[1] for l in run(["pacman", "-Ql", n]).splitlines()]
saida["arquivos"] = arquivos
# donos de /usr/bin, /usr/lib/systemd/system e /etc (para -Qo e para montar /usr/bin)
donos = {}
for l in run(["pacman", "-Ql"]).splitlines():
    n, f = l.split(" ", 1)
    if re.match(r"^/(usr/bin/[^/]+|etc/.+|usr/lib/systemd/system/[^/]+|boot/.*)$", f):
        donos[f] = n
saida["donos"] = donos

# ---- hooks do pacman (alpm) e quais pacotes disparam cada um ----
import fnmatch, glob
hooks = []
for f in sorted(glob.glob("/usr/share/libalpm/hooks/*.hook")):
    h = {"n": os.path.basename(f), "t": [], "d": "", "w": "", "dep": []}
    sec, cur = None, None
    for l in open(f, encoding="utf-8"):
        l = l.strip()
        if not l or l.startswith("#"):
            continue
        if l.startswith("["):
            sec = l.strip("[]")
            if sec == "Trigger":
                cur = {"ty": "", "op": [], "tg": []}; h["t"].append(cur)
            continue
        k, _, v = l.partition("=")
        k, v = k.strip(), v.strip()
        if sec == "Trigger":
            if k == "Type": cur["ty"] = v
            elif k == "Operation": cur["op"].append(v)
            elif k == "Target": cur["tg"].append(v)
        elif sec == "Action":
            if k == "Description": h["d"] = v
            elif k == "When": h["w"] = v
            elif k == "Depends": h["dep"].append(v)
    hooks.append(h)
saida["hooks"] = hooks
def casa(alvos, nome):
    ok = False
    for t in alvos:
        if t.startswith("!"):
            if fnmatch.fnmatchcase(nome, t[1:]): ok = False
        elif fnmatch.fnmatchcase(nome, t):
            ok = True
    return ok
def hooks_de(nome, arquivos, op):
    r = []
    for i, h in enumerate(hooks):
        for t in h["t"]:
            if op not in t["op"]:
                continue
            if t["ty"] == "Package" and casa(t["tg"], nome):
                r.append(i); break
            if t["ty"] == "Path" and any(casa(t["tg"], f) for f in arquivos):
                r.append(i); break
    return r
arqs_local = {}
for l in run(["pacman", "-Ql"]).splitlines():
    n, f = l.split(" ", 1)
    arqs_local.setdefault(n, []).append(f.lstrip("/"))
arqs_repo = {}
faltam = [n for n in repo if n not in local or repo[n]["v"] != local[n]["v"]]
for i in range(0, len(faltam), 300):
    for l in run(["pacman", "-Fl"] + faltam[i:i + 300], True).splitlines():
        n, f = l.split(" ", 1)
        arqs_repo.setdefault(n, []).append(f)
gatilhos = {}
for n in local:
    a = arqs_local.get(n, [])
    gatilhos[n] = {"n": len(a), "i": hooks_de(n, a, "Install"), "u": hooks_de(n, a, "Upgrade"), "r": hooks_de(n, a, "Remove")}
for n in faltam:
    a = arqs_repo.get(n, [])
    gatilhos.setdefault(n, {})
    gatilhos[n]["N"] = len(a)
    gatilhos[n]["I"] = hooks_de(n, a, "Install")
saida["gatilhos"] = gatilhos
saida["bins"] = {n: ["/" + f for f in arqs_repo.get(n, []) if re.match(r"^usr/bin/[^/]+$", f)] for n in faltam if any(re.match(r"^usr/bin/[^/]+$", f) for f in arqs_repo.get(n, []))}

# ---- pacman -Sl: todos os nomes e versões do repositório (a lista completa, compacta)
sl = {}
for l in run(["pacman", "-Sl"]).splitlines():
    c = l.split(" ")
    if len(c) >= 3:
        sl.setdefault(c[0], []).append(c[1] + " " + c[2])
saida["Sl"] = sl

# ---- cache de pacotes (influi no "Tamanho total download") ----
saida["cache"] = sorted(os.listdir("/var/cache/pacman/pkg"))

# ---- pacman -F (base de arquivos do repositório) ----
FQ = """hostname neofetch fastfetch ifconfig vlc gimp chromium thunderbird mpv inkscape obs ffmpeg convert pandoc tmux screen emacs micro hx ranger mc ncdu btop pip3 go cargo rustc java javac cmake ninja lspci lsusb sensors iwctl nmcli dhcpcd wpa_supplicant sddm gdm lightdm startplasma-wayland gnome-shell Xorg xinit i3 sway alacritty kitty hyprland waybar rofi netstat dig nslookup traceroute lspci lsusb htop tree git make gcc
python3 pip node npm docker vlc firefox code nvim zsh fish tmux unzip zip 7z rg fd bat eza jq curl wget
ssh sshd nginx mysql psql sqlite3 ufw rsync man tldr locate updatedb lsof strace nmap whois iperf3
ncdu duf btop smartctl hdparm dmidecode lshw inxi mkfs.vfat mkfs.ext4 mkfs.btrfs fsck.fat cryptsetup
arch-chroot pacstrap genfstab grub-install efibootmgr os-prober ntfs-3g paccache checkupdates pactree
reflector expac yay paru makepkg sudo doas visudo
drill lsblk adduser useradd vi ss ping ip host rename tar gzip xz zstd crontab sudoedit locale bsdtar gio nano vim lynx nc""".split()
fres = {}
for l in run(["pacman", "-F", "--machinereadable"] + FQ, True).split("\n"):
    c = l.split("\0")
    if len(c) == 4:
        base = c[3].rstrip("/").split("/")[-1]
        fres.setdefault(base, []).append(c)
saida["F"] = fres
saida["Fdb"] = sorted(os.listdir("/var/lib/pacman/sync"))

json.dump(saida, sys.stdout, ensure_ascii=False, separators=(",", ":"))
