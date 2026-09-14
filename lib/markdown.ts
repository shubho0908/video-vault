export const ENTRY_IMAGE_URL_PREFIX = "imagekit://";

export type NoteImageReference = {
  id: string;
  signedUrl: string;
  altText?: string | null;
};

const noteImagePattern = /!\[([^\]]*)\]\(imagekit:\/\/([A-Za-z0-9-]+)\)/g;

export function createNoteImageMarkdown(imageId: string, altText: string) {
  const safeAltText = altText.replace(/[\[\]]/g, "").trim() || "Uploaded image";
  return `![${safeAltText}](${ENTRY_IMAGE_URL_PREFIX}${imageId})`;
}

/**
 * Markdown persists image IDs rather than signed URLs. This keeps time-limited
 * ImageKit signatures out of the database and only resolves images owned by the
 * entry currently being rendered.
 */
export function resolveNoteImageReferences(
  markdown: string,
  images: NoteImageReference[]
) {
  const imageUrls = new Map(images.map(image => [image.id, image.signedUrl]));

  return markdown.replace(
    noteImagePattern,
    (_match, altText: string, imageId: string) => {
      const signedUrl = imageUrls.get(imageId);
      if (signedUrl) return `![${altText}](${signedUrl})`;

      const label =
        altText.replace(/[\[\]*_`]/g, "").trim() || "Uploaded image";
      return `*[Image unavailable: ${label}]*`;
    }
  );
}

/** Collapse markdown to a single-line plain-text excerpt for list previews. */
export function noteExcerpt(markdown: string, max = 160): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-+*]\s+/gm, "")
    .replace(/[*_~>|]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).trimEnd()}…`;
}
