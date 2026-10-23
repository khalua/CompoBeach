# CompoBeach

Send one prompt to several LLM configurations (provider, model, effort, context file) and read the replies side by side, with tokens in / cache / out and cost for every turn.

Design rules live in [DESIGN.md](DESIGN.md).

## Running locally

You need Node.js 22.12 or newer (`node -v`) and an API key for at least one provider. Ollama works without a key if it's running on `localhost:11434`.

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create your env file and add your keys:

   ```sh
   cp .env.example .env
   ```

   Fill in `ANTHROPIC_API_KEY` and/or `OPENAI_API_KEY`. Keys stay in `.env` on the local server and never reach the browser.

3. Start the dev servers:

   ```sh
   npm run dev
   ```

   This runs two processes together:

   | Process | URL | Notes |
   | --- | --- | --- |
   | client (Vite) | http://localhost:5173 | Open this one. Hot-reloads, proxies `/api` to the server. |
   | server (Express) | http://localhost:8787 | Restarts when files in `src/server` change. |
   | artifacts | http://localhost:8788 | Serves model-written files, started by the server. |

4. Open http://localhost:5173.

Other scripts:

- `npm run dev:server` or `npm run dev:client` starts one half on its own.
- `npm run typecheck` type-checks the client and the server.

Troubleshooting:

- **Edited `.env` and nothing changed:** the server only reads `.env` at startup. Stop `npm run dev` with Ctrl-C and start it again.
- **Port already in use:** stop whatever holds 5173, 8787 or 8788 (`lsof -i :8787`), or change the port. Vite doesn't read `.env`, so if you change the server port, set it in the shell so both halves agree: `PORT=9000 npm run dev`.
- **A provider errors on send:** check that its key is set in `.env` and that you restarted after setting it.

## Configuration

- **Prices:** `pricing.json`, USD per 1M tokens. Anthropic rates are pre-filled; add OpenAI and other models yourself. Models without an entry show `no price`. Edits apply without a restart.
- **OpenAI-compatible endpoints** (Ollama, OpenRouter, vLLM, Azure…): add them to `providers.config.json`. `apiKeyEnv` names the env var that holds the key.
- **Artifacts:** fenced code blocks that look like files (they have a filename, are HTML/SVG, or are 15+ lines) are written to `data/artifacts/<run>/<lane>/T<n>/`. Each turn lists them with **open ↗** and **download**, and Diff mode can compare a file both lanes produced. They're served from a separate origin (`http://localhost:8788`, `ARTIFACT_PORT`) whose Content-Security-Policy blocks requests back to the app, and the app's API rejects other origins, so model-written pages can't spend tokens or delete runs.
- **History:** every run is saved as JSON in `data/runs/` and can be reopened at `#/run/<id>`.
- **Styleguide:** `#/styleguide` renders every component and all four lane stocks.

## Production

```sh
npm run build && npm start   # serves the built client from http://localhost:8787
```
