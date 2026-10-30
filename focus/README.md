# focus

a quiet, local-first focus timer.

- **live**: https://mumbo235.github.io/simple-apps/focus/
- presets 5 / 15 / 25 / 50, optional session label
- timestamp-based timer that survives tab switches and reloads
- optional notifications, sound, and screen wake lock
- today and 7-day totals, recent sessions
- local-only storage under `focus.*`; export/import JSON
- installable PWA with its own manifest, icons, and service worker

## run locally

```bash
python3 -m http.server 8123
# open http://localhost:8123/focus/
```
