"use client";

import { attachImageAction } from "@/app/actions";

export const MAX_ENTRY_IMAGE_BYTES = 8 * 1024 * 1024;

const acceptedImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type UploadResult =
  | { ok: true; image: { id: string; signedUrl: string; altText: string } }
  | { ok: false; error: string };

function imageAltText(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  return withoutExtension.replace(/[-_]+/g, " ").trim() || "Uploaded image";
}

function validateImage(file: File) {
  if (!acceptedImageTypes.has(file.type)) {
    return "Use a JPG, PNG, WebP, or GIF image.";
  }
  if (file.size > MAX_ENTRY_IMAGE_BYTES) {
    return "Images must be 8 MB or smaller.";
  }
  return null;
}

/** Uploads directly to ImageKit, then records ownership server-side before exposing the image to the editor. */
export async function uploadEntryImage(
  entryId: string,
  file: File
): Promise<UploadResult> {
  const validationError = validateImage(file);
  if (validationError) return { ok: false, error: validationError };

  try {
    const credentialsResponse = await fetch(
      `/api/imagekit/auth?entryId=${encodeURIComponent(entryId)}`,
      { cache: "no-store" }
    );
    if (!credentialsResponse.ok)
      throw new Error("Could not prepare a secure upload.");

    const credentials = await credentialsResponse.json();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", file.name || "uploaded-image");
    formData.append("token", credentials.token);
    formData.append("expire", String(credentials.expire));
    formData.append("signature", credentials.signature);
    formData.append("publicKey", credentials.publicKey);
    formData.append("folder", credentials.folder);
    formData.append("useUniqueFileName", "true");
    formData.append("isPrivateFile", "true");
    formData.append("tags", "shubhojeets-videos");

    const uploadResponse = await fetch(
      "https://upload.imagekit.io/api/v1/files/upload",
      { method: "POST", body: formData }
    );
    if (!uploadResponse.ok)
      throw new Error("ImageKit could not upload this image.");

    const uploaded = await uploadResponse.json();
    const altText = imageAltText(file.name);
    const attached = await attachImageAction({
      entryId,
      fileId: uploaded.fileId,
      filePath: uploaded.filePath,
      url: uploaded.url,
      altText,
      width: uploaded.width,
      height: uploaded.height,
    });
    if (!attached.ok) throw new Error(attached.error);
    if (!attached.id || !attached.signedUrl)
      throw new Error(
        "The uploaded image could not be attached to this entry."
      );

    return {
      ok: true,
      image: { id: attached.id, signedUrl: attached.signedUrl, altText },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "The image upload did not complete.",
    };
  }
}

