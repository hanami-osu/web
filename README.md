# Hanami Web

The central website and shared account platform for the Hanami osu! ecosystem.

Hanami Web serves the public project site, owns canonical Hanami accounts, and acts as the OpenID Connect provider for first-party applications. It also handles Discord account linking and the bot preferences shown on the account page.

## What lives here

- Public pages for Hanami Bot, osu!guessr, and Hanami Companion
- Sign-in with Discord and osu! through Better Auth
- OAuth and OpenID Connect endpoints used by osu!guessr
- One-time Discord link tickets for Hanami Bot
- Account privacy, reauthentication, and deletion flows
- Compatibility synchronization into the existing Hanami Bot database

## Stack

- Next.js App Router and React for the website
- Bun for the runtime and package manager
- Native Next.js Route Handlers for the API
- Prisma 7 with MariaDB
- Better Auth for sessions, provider accounts, and the OAuth provider

## Requirements

- Bun 1.4.4 or newer
- MariaDB or MySQL
- A Discord OAuth application
- An osu! OAuth application
- An osu!guessr OIDC client configuration when testing that integration

## Local development

1. Install dependencies:

    ```bash
    bun install
    ```

2. Create the environment file:

    ```bash
    cp .env.example .env
    ```

3. Create separate databases for Hanami Web and the existing Hanami Bot schema. Set `WEB_DATABASE_URL` and `BOT_DATABASE_URL`. The application refuses to start when both URLs point to the same database.

4. Generate the Prisma clients, apply the web migrations, and register the osu!guessr OIDC client if you configured it:

    ```bash
    bun run db:generate
    bun run db:migrate
    bun run db:reconcile-oauth-client
    ```

5. Start the Next.js application:

    ```bash
    bun run dev
    ```

    The website and API run together at `http://localhost:3000`.

## Configuration

The full list is in `.env.example`. The important values are:

| Variable                                            | Purpose                                             |
| --------------------------------------------------- | --------------------------------------------------- |
| `BETTER_AUTH_URL`                                   | Public URL of this deployment                       |
| `BETTER_AUTH_SECRET`                                | Secret used by Better Auth                          |
| `WEB_DATABASE_URL`                                  | MariaDB database owned by Hanami Web                |
| `BOT_DATABASE_URL`                                  | Existing Hanami Bot database used for compatibility |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`       | Discord OAuth application                           |
| `OSU_CLIENT_ID` / `OSU_CLIENT_SECRET`               | osu! OAuth application                              |
| `BOT_LINK_SECRET`                                   | Shared secret for bot link tickets                  |
| `OSU_GUESSR_CLIENT_ID` / `OSU_GUESSR_REDIRECT_URIS` | Public osu!guessr OIDC client                       |
| `GITHUB_*`, `BMC_WEBHOOK_SECRET`                    | Hanami supporter linking and payment webhooks       |
| `TEST_DATABASE_URL`                                 | Optional disposable database for integration tests  |

Register the matching callback URLs with Discord (`/api/auth/callback/discord`) and osu! (`/api/auth/callback/osu`). Production callbacks must use HTTPS.

## Validation

Run the same checks used by CI:

```bash
bun run format:check
bun run lint
bun run typecheck
bun run test
bun run build
```

Tests that need `TEST_DATABASE_URL` are skipped when it is unset. Use a dedicated database whose name has `test`, `testing`, or `disposable` as a separate `-` or `_` delimited part (for example `hanami_test`); the test guard rejects other names and refuses to run against the configured web or bot database.

## Deployment

The Docker image runs database migrations and reconciles the osu!guessr OIDC client before starting the server. Run one application instance while migrations execute, then scale after startup if needed.

The image exposes `GET /api/health` for liveness checks. Published tags are `latest` and `sha-<commit>`. Deploy a commit tag when you need a reproducible release or rollback.

Terminate TLS before the application and set `BETTER_AUTH_URL` to the public HTTPS origin. The server adds baseline security headers to every response.

## Account data

Hanami Web is the canonical identity store. Hanami Bot keeps a small compatibility database containing its own user settings. The web application writes the Discord-to-osu! mapping needed by the bot and the bot preferences edited on the profile page, and deletes the user's row when a Hanami account is deleted. It never treats that database as a source of canonical identities.

## Hanami supporter

Supporters pay on Buy Me a Coffee or GitHub Sponsors and link that account on the supporter page (Buy Me a Coffee uses a one-time claim code pasted into the support note). Each platform's webhook keeps memberships current. One-time payments add time at $1 = 10 days; that time is saved while a membership is active. Anyone who has paid keeps the badge. Apps read the state through the `supporter` OIDC scope (`supporter_badge`, `supporter_active`, `supporter_until` claims), while osu!guessr uses the permanent badge. Badges are also pushed to osu!guessr's `POST /api/internal/supporter` through `OSU_GUESSR_INTERNAL_URL` / `OSU_GUESSR_INTERNAL_SECRET`; Web keeps failed deliveries pending and retries them at startup and every minute. Deploy Hanami Web (and reconcile the OIDC client) before osu!guessr starts requesting the `supporter` scope.

GitHub linking checks the existing sponsorship to the account in `siteConfig.links.githubSponsors`, including a one-time payment received before webhooks were enabled.

Grant time or the badge by hand with `bun run supporter:grant -- --osu <osu id> --usd <amount>` or `--badge-only`.

## Security

`OSU_GUESSR_CLIENT_ID` must match `HANAMI_CLIENT_ID` in the osu!guessr deployment. Reconciliation skips the client without an error when any redirect URI is invalid: only HTTPS, or HTTP on `localhost`, `127.0.0.1`, or `[::1]`, without a fragment.

Never commit production credentials, tokens, private keys, or real environment files. Generate independent values for `BETTER_AUTH_SECRET` and `BOT_LINK_SECRET`, and keep the osu!guessr redirect allowlist limited to exact callback URLs.

Report vulnerabilities privately through the organization [security policy](https://github.com/hanami-osu/.github/security/policy). Do not open a public issue with exploit details.

## License

Copyright © 2026 Hanami contributors.

This project is licensed under the GNU Affero General Public License version 3 only (`AGPL-3.0-only`). See [LICENSE](./LICENSE).

Hanami is an independent community project and is not affiliated with or endorsed by osu! or ppy Pty Ltd.
