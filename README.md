# Daily Brief

A personal daily news brief dashboard covering **7 categories**: Top World, Tech and AI, Cleveland Browns, Ohio State Buckeyes, Formula 1, Escape from Tarkov, and Columbus and Gahanna.

## How it works

- `data/news.json` is regenerated twice daily by an agent cron job and committed to this repo.
- GitHub Pages serves the `main` branch as a static site — **no backend, no build step**.
- `app.js` fetches the JSON, validates it, and renders story cards grouped by category with a sticky filter bar (All + 7 categories), a live last-updated badge, and a 15-minute auto-refresh.

## Verify locally

```sh
python3 -m http.server
```

Then open http://localhost:8000 in a browser.
