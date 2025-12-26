# Auto Suggestion Discord Bot

A small Discord DM-only bot that generates suggested replies and rewrites using the OpenRouter API. It provides two slash commands (`/suggest`, `/rewrite`) and interactive buttons (copy, rewrite, shorter) in direct messages.

**Features**
- **Suggest replies**: Generate 3 reply variations for a given message.
- **Rewrite drafts**: Improve a user-provided message according to tone and length.
- **Interactive buttons**: Copy, rewrite or shorten suggested options (implemented in `test.js`).

**Prerequisites**
- Node.js 18+ (or a recent Node LTS)
- A Discord application + bot token
- OpenRouter API key and a supported model

**Files of interest**
- [index.js](index.js) — core bot (registers commands, handles interactions).
- [test.js](test.js) — alternate version with interactive buttons and per-user memory.
- [env.example](env.example) — sample environment variables.
- [package.json](package.json) — project manifest and start script.

**Environment variables**
Copy [env.example](env.example) to `.env` and fill values:

- `DISCORD_TOKEN` — your bot token.
- `OPENROUTER_API_KEY` — OpenRouter API key.
- `OPENROUTER_MODEL` — model name (example: `openai/gpt-oss-20b:free`).
- `CLIENT_ID` — your Discord application client ID.

**Install & Run**

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from [env.example](env.example) and populate it.

3. Start the bot:

```bash
npm start
```

The `start` script runs `node test.js` by default. Use `index.js` instead if you prefer the non-interactive variant; update `package.json` or run `node index.js` directly.

**Commands**
- `/suggest message:<text> tone:<choice?> length:<choice?>` — generate 3 suggested replies. Works only in direct messages; the bot will reply ephemeral DM content.
- `/rewrite text:<text> tone:<choice?> length:<choice?>` — rewrite or improve a draft message.

Tone choices include: Casual, Friendly, Polite, Professional, Flirty.
Length choices include: Short, Medium, Long.

**Interactive buttons** (implemented in `test.js`)
- `📋 Copy` — returns the text to the user.
- `🔁 Rewrite` — asks the AI to rewrite the selected option.
- `✂ Shorter` — asks the AI to shorten the selected option.

**Troubleshooting**
- Ensure the bot has the correct intents and is invited to at least one server. The bot runs in DMs — open a DM with the bot to use it.
- Confirm `DISCORD_TOKEN`, `CLIENT_ID`, `OPENROUTER_API_KEY`, and `OPENROUTER_MODEL` are correct.
- If slash commands aren't visible immediately, wait a few minutes for global commands to register or check logs for registration errors.

**License**
This project uses the ISC license as declared in `package.json`.

---

If you want, I can also:
- update `package.json` to have a `start:index` script for `index.js`,
- add a small CONTRIBUTING or LICENSE file, or
- run a quick local smoke test (if you provide the required tokens).
