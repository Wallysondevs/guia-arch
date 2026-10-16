#!/usr/bin/python3
# tools/vm/extrair-home.py — roda NA VM como ana (só leitura): pastas ~/aur e os arquivos de
# configuração da ana, para o simulador.  ~/guia-arch-lab/vm 'python3 -' < tools/vm/extrair-home.py
import json, os
os.chdir(os.path.expanduser("~/aur"))
r = {}
for d in ["yay-bin", "paru-bin", "downgrade"]:
    for f in sorted(os.listdir(d)):
        p = d + "/" + f; st = os.lstat(p)
        e = {"m": st.st_mode & 0o7777, "mt": int(st.st_mtime), "s": st.st_size, "d": os.path.isdir(p), "nl": st.st_nlink, "b": st.st_blocks // 2}
        if f in ("PKGBUILD", ".SRCINFO", ".gitignore"):
            e["c"] = open(p).read()
        r[p] = e
for p in ["/home/ana/.bashrc", "/home/ana/.bash_profile", "/home/ana/.bash_logout"]:
    st = os.lstat(p); r[p] = {"m": st.st_mode & 0o7777, "mt": st.st_mtime, "s": st.st_size, "c": open(p).read()}
print(json.dumps(r))
