# CompoBeach

Send one prompt to several LLM configurations (provider, model, effort, context file) and read the replies side by side, with tokens in / cache / out and cost for every turn.

Design rules live in [DESIGN.md](DESIGN.md).

## Setup

```sh
npm install
cp .env.example .env   # add ANTHROPIC_API_KEY and/or OPENAI_API_KEY
npm run dev            # server :8787 + client http://localhost:5173
```

Keys stay in `.env` on the local server and never reach the browser. Restart `npm run dev` after editing `.env`.

- **Prices:** `pricing.json`, USD per 1M tokens. Anthropic rates are pre-filled; add OpenAI and other models yourself. Models without an entry show `no price`. Edits apply without a restart.
- **OpenAI-compatible endpoints** (Ollama, OpenRouter, vLLM, Azure…): add them to `providers.config.json`. `apiKeyEnv` names the env var that holds the key.
- **Artifacts:** fenced code blocks that look like files (they have a filename, are HTML/SVG, or are 15+ lines) are written to `data/artifacts/<run>/<lane>/T<n>/`. Each turn lists them with **open ↗** and **download**, and Diff mode can compare a file both lanes produced. They're served from a separate origin (`http://localhost:8788`, `ARTIFACT_PORT`) whose Content-Security-Policy blocks requests back to the app, and the app's API rejects other origins, so model-written pages can't spend tokens or delete runs.
- **History:** every run is saved as JSON in `data/runs/` and can be reopened at `#/run/<id>`.
- **Styleguide:** `#/styleguide` renders every component and all four lane stocks.

## Production

```sh
npm run build && npm start   # serves the built client from http://localhost:8787
```
