# Shubhojeet's Videos Architecture

## Access Model

The application is private by design. Better Auth manages Google OAuth users, accounts, verification records, and sessions in MySQL. The application additionally requires every protected page, server action, and route handler to validate that the signed-in user email exactly matches `OWNER_EMAIL`. An authenticated but unapproved Google account has no journal access and cannot read or mutate any data.

## Data Model

| Entity          | Purpose                               | Primary fields                                                                            |
| --------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- |
| `user`          | Better Auth identity record           | `id`, `name`, `email`, `emailVerified`, `image`, timestamps                               |
| `session`       | Better Auth session record            | `id`, `userId`, `token`, `expiresAt`, timestamps                                          |
| `account`       | Google OAuth account linkage          | `id`, `userId`, provider and token metadata                                               |
| `verification`  | Better Auth verification flow records | `id`, `identifier`, `value`, `expiresAt`                                                  |
| `video_entries` | A single learning-journal entry       | `id`, `ownerId`, `title`, `youtubeUrl`, `youtubeId`, `topic`, `notesMarkdown`, timestamps |
| `entry_images`  | Reference image metadata for an entry | `id`, `entryId`, `fileId`, `filePath`, `url`, `altText`, dimensions, timestamps           |

Every application record is tied to the owner user ID and every database operation scopes to that owner ID. The YouTube ID is derived from a validated `youtube.com` or `youtu.be` URL on the server, which prevents arbitrary embed sources.

## Core Workflows

| Workflow     | User experience                                                                  | Server-side guarantee                                                                                    |
| ------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Sign in      | User selects Google and returns to the dashboard.                                | Session is validated and the email must match `OWNER_EMAIL`.                                             |
| Create entry | User supplies a title, unlisted YouTube link, topic, notes, and optional images. | The URL is normalized, the video ID is extracted, and the entry is stored only for the owner.            |
| Edit entry   | User works in a split Markdown compose and preview editor.                       | Updates are scoped to the owner and reject non-existent or foreign entry IDs.                            |
| Upload image | User chooses a reference image and receives upload progress.                     | A protected route produces short-lived ImageKit upload credentials, enforcing accepted formats and size. |
| Review entry | User watches the inline video while reading notes and reference images.          | Page load verifies the owner session and only loads the owner's entry.                                   |
| Delete entry | User confirms a destructive action in a dialog.                                  | The record delete is owner-scoped; ImageKit asset deletion is attempted only after authorization.        |

## Implementation Choices

The app uses Next.js 16.3.1 with the App Router, Better Auth 1.7.0, and ImageKit's Next.js SDK 2.1.5, verified during project setup on 2026-08-18. ImageKit is technically feasible: its Next.js SDK supports the App Router and direct browser uploads using a server-created signature. The final integration requires `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, and `IMAGEKIT_URL_ENDPOINT`; the private key remains server-only. Google sign-in additionally requires a Google OAuth client ID, client secret, a Better Auth secret, its public base URL, and the owner's approved Google email.
