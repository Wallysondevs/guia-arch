#!/usr/bin/python3
# tools/vm/extrair-sistema.py — roda NA VM como root (só leitura) e imprime um JSON com
# arquivos de configuração, listagens e o estado dos serviços, usados pelo simulador.
#     ~/guia-arch-lab/vm -u root 'python3 -' < tools/vm/extrair-sistema.py > tools/vm/sistema.json
# Não muda nada na VM e não varre o disco (só caminhos exatos e pastas de um nível).
import json, os, stat, subprocess, sys, time

def run(args, env=None):
    e = dict(os.environ); e.update(env or {})
    r = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=e)
    return r.stdout

def info(p):
    st = os.lstat(p)
    d = {"m": stat.S_IMODE(st.st_mode), "u": st.st_uid, "g": st.st_gid, "mt": int(st.st_mtime), "s": st.st_size}
    if stat.S_ISLNK(st.st_mode):
        d["t"] = "l"; d["l"] = os.readlink(p)
    elif stat.S_ISDIR(st.st_mode):
        d["t"] = "d"
    elif stat.S_ISREG(st.st_mode):
        d["t"] = "f"
    else:
        d["t"] = "o"
    return d

ARQUIVOS = """/etc/os-release /usr/lib/os-release /etc/hostname /etc/hosts /etc/locale.conf /etc/vconsole.conf
/etc/fstab /etc/default/grub /etc/pacman.conf /etc/pacman.d/mirrorlist /etc/passwd /etc/group /etc/shadow
/etc/gshadow /etc/shells /etc/sudoers /etc/locale.gen /etc/localtime /etc/mkinitcpio.conf /etc/mkinitcpio.d/linux.preset
/etc/mkinitcpio.d/linux-lts.preset /etc/resolv.conf /etc/issue /etc/profile /etc/bash.bashrc /etc/bash.bash_logout
/etc/environment /etc/machine-id /etc/adjtime /etc/makepkg.conf /etc/nsswitch.conf /etc/login.defs /etc/securetty
/etc/nginx/nginx.conf /etc/ssh/sshd_config /etc/systemd/journald.conf /etc/systemd/timesyncd.conf
/etc/xdg/reflector/reflector.conf /etc/subuid /etc/subgid /etc/skel/.bashrc /etc/skel/.bash_profile
/etc/skel/.bash_logout /etc/sudoers.d /etc/X11 /usr/share/nginx/html/index.html /usr/share/nginx/html/50x.html
/etc/cron.d /etc/crontab /etc/NetworkManager/NetworkManager.conf /etc/ufw/ufw.conf /etc/snapper/configs
/etc/zram-generator.conf /etc/systemd/zram-generator.conf /etc/pacman.d/gnupg /etc/pacman.d/hooks
/boot/grub/grub.cfg /proc/cmdline /proc/version /proc/cpuinfo /proc/meminfo /proc/loadavg /proc/uptime
/home/ana/.ssh /root/.ssh""".split()
arq = {}
for p in ARQUIVOS:
    try:
        d = info(p)
    except FileNotFoundError:
        continue
    if d["t"] == "f" and (d["s"] < 40000 or p.startswith("/proc/")):
        try:
            d["c"] = open(p, encoding="utf-8").read()
        except Exception:
            pass
    if d["t"] == "d":
        d["ls"] = sorted(os.listdir(p))
    arq[p] = d

# pastas de um nível (nomes, tipo, modo, dono, tamanho, data)
PASTAS = """/ /boot /boot/grub /boot/EFI /etc /etc/default /etc/pacman.d /etc/systemd /etc/systemd/system
/etc/systemd/system/multi-user.target.wants /etc/systemd/system/getty.target.wants
/etc/systemd/system/network-online.target.wants /etc/systemd/system/sockets.target.wants
/etc/systemd/system/timers.target.wants /etc/systemd/user /etc/skel /usr /usr/bin /usr/lib/systemd/system
/var /var/log /var/cache /var/cache/pacman /var/lib /var/lib/pacman /var/lib/pacman/sync /srv /srv/http
/opt /mnt /root /home /usr/share/nginx/html /etc/nginx /usr/lib/modules /dev""".split()
pastas = {}
for p in PASTAS:
    try:
        nomes = os.listdir(p)
    except Exception:
        continue
    item = {"self": info(p), "c": {}}
    for n in sorted(nomes):
        try:
            item["c"][n] = info(os.path.join(p, n))
        except Exception:
            pass
    pastas[p] = item

# estado dos serviços que as aulas usam
UNIDADES = """sshd.service NetworkManager.service nginx.service cronie.service systemd-timesyncd.service
systemd-journald.service systemd-logind.service systemd-resolved.service systemd-networkd.service dbus-broker.service
polkit.service getty@tty1.service podman.socket podman.service snapper-timeline.timer snapper-cleanup.timer
snapperd.service fstrim.timer paccache.timer reflector.service reflector.timer ufw.service
systemd-zram-setup@zram0.service man-db.timer shadow.timer systemd-tmpfiles-clean.timer
archlinux-keyring-wkd-sync.timer NetworkManager-wait-online.service systemd-udevd.service
bluetooth.service cups.service docker.service avahi-daemon.service lvm2-monitor.service
remote-fs.target multi-user.target graphical.target""".split()
PROPS = "Id,Names,Description,LoadState,ActiveState,SubState,UnitFileState,UnitFilePreset,FragmentPath,MainPID,ExecMainStartTimestamp,ActiveEnterTimestamp,InactiveExitTimestamp,ActiveExitTimestamp,TasksCurrent,MemoryCurrent,MemoryPeak,CPUUsageNSec,ControlGroup,Documentation,TriggeredBy,Triggers,Type,Result,ExecMainCode,ExecMainStatus,NextElapseUSecRealtime,LastTriggerUSec,WantedBy"
servicos = {}
for u in UNIDADES:
    s = run(["systemctl", "show", u, "-p", PROPS], {"SYSTEMD_PAGER": "cat"})
    d = {}
    for l in s.splitlines():
        if "=" in l:
            k, v = l.split("=", 1); d[k] = v
    d["cat"] = run(["systemctl", "cat", u, "--no-pager"], {"SYSTEMD_PAGER": "cat"})
    d["status"] = run(["systemctl", "status", u, "--no-pager", "-l", "-n", "10"], {"SYSTEMD_PAGER": "cat", "SYSTEMD_COLORS": "0", "COLUMNS": "200"})
    servicos[u] = d

saidas = {}
CMDS = {
    "list-units-service": ["systemctl", "list-units", "--type=service", "--no-pager"],
    "list-units-service-all": ["systemctl", "list-units", "--type=service", "--all", "--no-pager"],
    "list-unit-files-service": ["systemctl", "list-unit-files", "--type=service", "--no-pager"],
    "list-unit-files": ["systemctl", "list-unit-files", "--no-pager"],
    "list-timers": ["systemctl", "list-timers", "--no-pager"],
    "list-timers-all": ["systemctl", "list-timers", "--all", "--no-pager"],
    "list-units-socket": ["systemctl", "list-units", "--type=socket", "--no-pager"],
    "list-units": ["systemctl", "list-units", "--no-pager"],
    "journal-b0": ["journalctl", "-b", "0", "--no-pager", "-o", "short-iso-precise"],
    "journal-b0-json": ["journalctl", "-b", "0", "--no-pager", "-o", "json", "--output-fields=_SYSTEMD_UNIT,PRIORITY,SYSLOG_IDENTIFIER,_PID,MESSAGE,_TRANSPORT,_COMM,UNIT"],
    "journal-list-boots": ["journalctl", "--list-boots", "--no-pager"],
    "journal-disk-usage": ["journalctl", "--disk-usage"],
    "ps": ["ps", "-eo", "user,pid,ppid,pcpu,pmem,vsz,rss,tty,stat,lstart,time,comm,args", "--no-headers"],
    "pacman-log": ["cat", "/var/log/pacman.log"],
}
for k, c in CMDS.items():
    saidas[k] = run(c, {"SYSTEMD_PAGER": "cat", "SYSTEMD_COLORS": "0", "COLUMNS": "200", "LANG": "pt_BR.UTF-8"})

json.dump({"arquivos": arq, "pastas": pastas, "servicos": servicos, "saidas": saidas, "agora": int(time.time())}, sys.stdout, ensure_ascii=False, separators=(",", ":"))
