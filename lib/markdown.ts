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

// Store image IDs, not expiring signed URLs; resolve only images owned by the current entry.
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
