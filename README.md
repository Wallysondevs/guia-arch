# Guia Arch

Curso de Arch Linux em português, do zero ao avançado, em **3 níveis + projetos + referência** (76 páginas): instalação manual passo a passo, pacman, AUR, systemd, discos, kernel e boot, Btrfs com snapshots, LUKS, LVM, recuperação com chroot e empacotamento.

Tudo foi conferido num **Arch Linux real** (VM VirtualBox UEFI, instalada à mão seguindo a Arch Wiki em outubro de 2026): as saídas, os erros e as capturas de tela são da máquina de verdade. As páginas trazem um terminal simulado do Arch (`pacman`, `sudo`, `systemctl`…, com dados reais da VM) e um editor de scripts para praticar no navegador.

Site 100% estático (HTML + CSS + JS, sem build e sem dependências externas).

## Estrutura

```
index.html                 página inicial
<tema>.html                uma aula por tema
img/                       capturas reais (live, GRUB, archinstall, htop, nmtui…)
assets/style.css           visual (tema claro/escuro)
assets/site.js             níveis/menu (lista NIVEIS), terminais com o prompt do Arch, exercícios
assets/bashsim.js          interpretador de Bash + máquina Arch simulada
assets/archsim-dados.js    dados reais da VM (pacotes, serviços, arquivos), carregados sob demanda
tools/                     testes das missões e bateria simulador × VM
CONTRIBUINDO.md            como escrever uma aula (e os fatos já conferidos na VM)
```

## Testes

```bash
node tools/testar-missoes.js --sem-lab   # todas as missões no simulador
node tools/testar-missoes.js             # comparando com a VM real (precisa do laboratório)
```

## Publicar no GitHub Pages

Envie a pasta para um repositório e ative **Settings → Pages → Deploy from a branch → main / (root)**.
