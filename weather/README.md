# weather

a quiet, local-first weather forecast.

- **live**: https://mumbo235.github.io/simple-apps/weather/
- current conditions, hourly strip, 7-day forecast
- search any place with Open-Meteo geocoding, or use your location once
- saved places, celsius / fahrenheit, sunrise / sunset
- last forecast cached locally for offline viewing
- installable PWA with its own manifest, icons, and service worker
- no account, no API key, no ads

forecast data by [Open-Meteo](https://open-meteo.com/).

## run locally

```bash
python3 -m http.server 8123
# open http://localhost:8123/weather/
```
