# Docker Ubuntu 24 + Python + Node.js 18

Entorno Ubuntu 24.04 con Python 3, Node.js 18 y OpenSSH. Los scripts de `test/scripts` se montan en `/root` (raíz del usuario).

## Uso

```bash
cd docker-ubuntu-env
docker compose up -d
docker compose exec ubuntu bash
```

## SSH

- Puerto: `2222` (host) → `22` (contenedor)
- Usuario: `root` / Contraseña: `root`

```bash
ssh -p 2222 root@localhost
```

Dentro del contenedor:
- Python: `python3`, `pip3`
- Node.js: `node`, `npm` (v18)
- Scripts: en `/root` (ej. `python3 busy-wait.py`, `node blocking-io.js`)
