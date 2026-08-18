# Authenticated Verification Runbook

Use this short runbook after configuring the user-owned Vercel deployment, Google OAuth redirect URI, Neon connection strings, ImageKit credentials, and `OWNER_EMAIL`.

| Step | Desktop check | Mobile check |
| --- | --- | --- |
| 1. Owner sign-in | Open `/sign-in` at 1280px wide and complete Google sign-in with the configured `OWNER_EMAIL`. Confirm redirection to `/dashboard`. | Repeat at 375px wide. Confirm the sign-in card remains centered with an accessible full-width sign-in button. |
| 2. Dashboard layouts | Add at least two entries, then use the view switch to verify both the three-column card grid and compact list view. Search by title and filter by topic. | Confirm cards collapse to one column; compact rows retain thumbnail, title, topic, date, and delete action without horizontal overflow. |
| 3. Entry reading | Open an entry, confirm the privacy-enhanced YouTube embed, rendered Markdown, and signed ImageKit image gallery. | Confirm the reading column precedes reference images and that the video preserves its aspect ratio. |
| 4. Inline notes | In the entry detail page, change text in the Markdown editor, use **Preview**, save, refresh, and confirm rendered notes update. | Confirm the editor and preview panel stay within the viewport and save button remains usable. |
| 5. Image workflow | On the edit page, upload a JPG/PNG/WebP/GIF under 8 MB, confirm it appears, then delete it. | Confirm the upload action, gallery, and removal control remain reachable. |
| 6. Access boundary | Sign out, visit `/dashboard`, and confirm redirection to `/sign-in?restricted=1`. Then sign in with a non-owner Google account and confirm it remains restricted. | Repeat the sign-out redirect check. |

Run the live external checks from a network-capable machine before launch:

```bash
bun run test:integration
```

The Neon portion verifies the six expected Postgres tables. The ImageKit portion verifies a lightweight authenticated file-list request without printing credentials.
