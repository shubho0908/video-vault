# Shubhojeet's Videos

Shubhojeet's Videos is an independently deployable, **single-owner video learning journal**. It lets one approved Google account save unlisted YouTube explanations, write Markdown notes with live preview, and attach private ImageKit reference images.

## Independent architecture

The deployed application has **no runtime dependency on Manus services**. It is a standard Bun-managed Next.js project intended for a user-owned GitHub repository and Vercel project.

| Layer | Service | Purpose |
| --- | --- | --- |
| Application | Next.js 16 App Router on Vercel | Server-rendered journal, route handlers, server actions, and Better Auth endpoints. |
| Database | Neon Postgres + Drizzle ORM | Better Auth identities/sessions and owner-scoped journal data. |
| Authentication | Better Auth + Google OAuth | Google sign-in, then strict allowlisting by `OWNER_EMAIL`. |
| Media | ImageKit | Direct private image upload, CDN transformation, signed image delivery, and cleanup. |
| Workflows | None by default | Inngest is intentionally omitted; add it only for durable background features such as transcription or review reminders. |

## Run locally with Bun

Install [Bun](https://bun.com/docs/installation), create a Neon project, then copy `.env.example` to `.env.local` and supply your own credentials.

```bash
bun install
bun run db:generate
bun run db:migrate
bun run dev
```

The runtime uses `DATABASE_URL`, which should be Neon's **pooled** connection string. Drizzle migrations use `DATABASE_URL_UNPOOLED`, which must be the direct, non-pooled connection string. Both require `sslmode=require`.[1]

## Google OAuth and owner access

In Google Cloud Console, create a **Web application** OAuth client. Add these authorised redirect URIs:

```text
http://localhost:3000/api/auth/callback/google
https://your-domain.example/api/auth/callback/google
```

Set `BETTER_AUTH_URL` to the same base production URL. Better Auth derives the provider callback from this value, so mismatches cause Google `redirect_uri_mismatch` errors.[2]

The app is deliberately fail-closed: a signed-in user is granted access only if their Google email exactly matches `OWNER_EMAIL`. Do not leave this variable empty.

## ImageKit privacy configuration

The app uploads reference images with `isPrivateFile=true` and renders them with short-lived server-generated signed URLs. In ImageKit, enable **Restrict all requests** for images to make invalid or unsigned URLs return `401 Unauthorized`.[3]

## Deploy to Vercel

Create a private GitHub repository, push this code, and import it into a Vercel project. Select Bun as the package manager. Set the variables from `.env.example` in **Production**, then configure the production Vercel domain in both `BETTER_AUTH_URL` and Google Cloud Console. Apply migrations using the direct Neon URL before the first public deployment:

```bash
bun run db:migrate
```

Vercel is suitable for this personal journal on the Hobby plan, but the account must remain within plan limits. Neon's free plan likewise suspends database connections when its monthly compute or transfer quota is exhausted, so monitor both provider dashboards.[4] [5]

## Verification commands

```bash
bun run check
bun run test
NODE_ENV=production bun run build
```

External credential checks are kept separate because they make live network calls:

```bash
bun run test:integration
```

## References

[1]: https://neon.com/docs/guides/drizzle "Connect from Drizzle to Neon"
[2]: https://better-auth.com/docs/authentication/google "Better Auth Google provider"
[3]: https://imagekit.io/docs/media-delivery-basic-security "ImageKit media delivery basic security"
[4]: https://vercel.com/docs/plans/hobby "Vercel Hobby plan"
[5]: https://neon.com/faqs/free-plan-limits-and-quotas "Neon free plan limits and quotas"
