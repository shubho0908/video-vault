"use client";

import { ImagePlus, LoaderCircle, Trash2, UploadCloud } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { attachImageAction, deleteEntryImageAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ReferenceImage = {
  id: string;
  filePath: string;
  altText: string | null;
  width: number | null;
  height: number | null;
  signedUrl: string;
};

export function ImagePanel({ entryId, images }: { entryId: string; images: ReferenceImage[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.match(/^image\/(jpeg|png|webp|gif)$/)) {
      setError("Use a JPG, PNG, WebP, or GIF reference image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Reference images must be 8 MB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const credentialsResponse = await fetch(`/api/imagekit/auth?entryId=${encodeURIComponent(entryId)}`, { cache: "no-store" });
      if (!credentialsResponse.ok) throw new Error("Could not prepare a secure upload.");
      const credentials = await credentialsResponse.json();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name);
      formData.append("token", credentials.token);
      formData.append("expire", String(credentials.expire));
      formData.append("signature", credentials.signature);
      formData.append("publicKey", credentials.publicKey);
      formData.append("folder", credentials.folder);
      formData.append("useUniqueFileName", "true");
      formData.append("isPrivateFile", "true");
      formData.append("tags", "learning-video-vault");

      const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", { method: "POST", body: formData });
      if (!response.ok) throw new Error("ImageKit could not upload this image.");
      const uploaded = await response.json();
      const attached = await attachImageAction({
        entryId,
        fileId: uploaded.fileId,
        filePath: uploaded.filePath,
        url: uploaded.url,
        altText: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
        width: uploaded.width,
        height: uploaded.height,
      });
      if (!attached.ok) throw new Error(attached.error);
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The image upload did not complete.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeImage(imageId: string) {
    startDeleting(async () => {
      const result = await deleteEntryImageAction(imageId, entryId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-border/80 bg-card/80 p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div><h2 className="font-serif text-2xl tracking-[-0.03em]">Reference images</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Private ImageKit assets, visible only through signed links in your journal.</p></div>
        <div><Label htmlFor="reference-image" className="sr-only">Upload reference image</Label><Input ref={inputRef} id="reference-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => uploadImage(event.target.files?.[0])} /><Button type="button" variant="outline" className="rounded-lg" onClick={() => inputRef.current?.click()} disabled={uploading}>{uploading ? <LoaderCircle className="animate-spin" /> : <UploadCloud />}{uploading ? "Uploading" : "Add image"}</Button></div>
      </div>
      {error ? <p className="mt-4 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {images.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{images.map((image) => <figure key={image.id} className="group relative overflow-hidden rounded-lg border border-border bg-muted"><img src={image.signedUrl} alt={image.altText ?? "Reference image"} className="aspect-[4/3] w-full object-cover" /><figcaption className="flex items-center justify-between gap-2 px-3 py-2"><span className="truncate text-xs text-muted-foreground">{image.altText ?? "Reference image"}</span><Button type="button" variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeImage(image.id)} disabled={isDeleting} aria-label="Remove reference image">{isDeleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}</Button></figcaption></figure>)}</div> : <div className="mt-5 grid min-h-40 place-items-center rounded-lg border border-dashed border-border bg-muted/30 px-5 text-center"><div><ImagePlus className="mx-auto size-5 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">Attach diagrams, screenshots, or visual references that support these notes.</p></div></div>}
    </section>
  );
}
