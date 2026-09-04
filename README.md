# prelegal
A platform for drafting common legal agreements

**Status:** In progress — expected completion around 2026-08-29.

## Running locally

Requires [Docker](https://www.docker.com/products/docker-desktop/).

```bash
# Mac
scripts/start-mac.sh
scripts/stop-mac.sh

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows (PowerShell)
scripts/start-windows.ps1
scripts/stop-windows.ps1
```

The app is served at http://localhost:8000. The database is SQLite and is recreated from scratch on every start.
