# notes

a quiet, local-first notes app in the same visual language as to:do.

- **live**: https://mumbo235.github.io/simple-apps/notes/
- notebooks, pinned notes, search across everything, autosave, trash + restore
- local-only storage under `notes.*`; no account, no server, no sync
- export/import JSON backups from the menu
- installable PWA with its own manifest, icons, and service worker

## run locally

from the repository root:

```bash
python3 -m http.server 8123
# open http://localhost:8123/notes/
```

the app is standalone: it has its own service worker and does not read or write to:do data.
