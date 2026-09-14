# Independent Deployment Research

This journal should not run on a managed Manus runtime. The codebase can instead deploy as a standard Bun-managed Next.js application on an external platform, with its database, authentication, media delivery, and optional background workflows owned through external accounts. Inngest is not an application host or database. It is a durable workflow service that runs function code on the selected hosting platform.[1] [2]

| Service       | Suitable responsibility                      | Relevant hard limit or behavior                                                                                                                                                                                                            | Fit for this journal                                                                                                                                   |
| ------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Vercel Hobby  | Next.js hosting and route handlers           | 1 million function invocations monthly, 100 GB fast data transfer, 200 projects, 100 deployments daily, and a 45-minute build maximum.[3] [4]                                                                                              | Suitable for a private personal journal with normal CRUD traffic.                                                                                      |
| Neon Free     | PostgreSQL database                          | 100 CU-hours, 0.5 GB storage, and 5 GB public network transfer monthly per project. It scales to zero after 5 minutes; reaching compute or transfer quota suspends connections until reset or upgrade.[5]                                  | Suitable for a small personal journal, but it must be monitored because quota exhaustion pauses the database.                                          |
| Inngest Hobby | Optional durable workflows                   | 50,000 executions, 5 concurrent steps, 500,000 events, 100,000 queue depth, 256 KiB event payloads, 24-hour trace history, and 7-day maximum sleeps on free.[1] [6]                                                                        | Not needed for video entry CRUD. Add only for asynchronous transcription, notifications, or enrichment. Never send image or video bytes as event data. |
| ImageKit Free | Image upload, optimization, and CDN delivery | ImageKit’s free plan has fixed limits; its pricing documentation states that a feature stops when its free inclusion is exceeded, until an upgrade. Uploaded asset storage and optimized delivery bandwidth are separately metered.[7] [8] | Continue using it as the media layer, with an upload size limit in the app and dashboard usage monitoring.                                             |

## Recommended Independent Architecture

Use **Vercel for Next.js hosting**, **Neon Postgres for the relational database**, **Better Auth with Google OAuth** in the app, and **ImageKit** for reference images. Configure all credentials as Vercel environment variables and connect the repository to a user-owned GitHub repository. This creates no runtime dependency on Manus; local development and deployment use Bun, GitHub, Vercel, Neon, Google Cloud, and ImageKit accounts controlled by the user.

Inngest should remain deliberately optional. The base app is synchronous CRUD and does not need a queue. If later features require long-running work, introduce Inngest only for tasks such as extracting transcripts, generating learning summaries, retrying ImageKit cleanup, or scheduled review reminders. Every workflow must pass small identifiers or URLs, not raw media.

## Neon and Drizzle Implementation Notes

For Vercel-style serverless runtime, the application uses the Neon serverless HTTP driver through Drizzle. Neon documents HTTP as the appropriate option for single, non-interactive queries, while its pooled connection string is intended for runtime and the direct, non-pooled connection string is intended for Drizzle migrations.[9] [10] Better Auth is connected to the same database through its official Drizzle adapter with the PostgreSQL provider.[11]

Reference images are uploaded as ImageKit private files. The application generates expiring signed delivery URLs server-side; ImageKit documents that a private asset requires a valid signed URL or named transformation, and unsigned URL restrictions must be enabled in the ImageKit dashboard if account-wide enforcement is desired.[12]

## References

[1]: https://www.inngest.com/pricing "Inngest pricing"
[2]: https://www.inngest.com/docs/usage-limits/providers "Inngest provider usage limits"
[3]: https://vercel.com/docs/limits "Vercel limits"
[4]: https://vercel.com/docs/plans/hobby "Vercel Hobby plan"
[5]: https://neon.com/faqs/free-plan-limits-and-quotas "Neon free plan limits and quotas"
[6]: https://www.inngest.com/docs/usage-limits/inngest "Inngest usage limits"
[7]: https://imagekit.io/docs/how-pricing-works "How ImageKit pricing works"
[8]: https://imagekit.io/plans/ "ImageKit plans"
[9]: https://neon.com/docs/guides/drizzle "Connect from Drizzle to Neon"
[10]: https://neon.com/docs/serverless/serverless-driver "Neon serverless driver"
[11]: https://better-auth.com/docs/adapters/drizzle "Better Auth Drizzle adapter"
[12]: https://imagekit.io/docs/media-delivery-basic-security "ImageKit media delivery basic security"
