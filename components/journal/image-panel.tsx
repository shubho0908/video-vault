"use client";

import { ImagePlus, LoaderCircle, Trash2, UploadCloud } from "lucide-react";
import type { ClipboardEvent, DragEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteEntryImageAction } from "@/app/actions";
import { uploadEntryImage } from "@/components/journal/entry-image-upload";
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

export function ImagePanel({
  entryId,
  images,
}: {
  entryId: string;
  images: ReferenceImage[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const result = await uploadEntryImage(entryId, file);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function pasteImage(event: ClipboardEvent<HTMLElement>) {
    const file = Array.from(event.clipboardData.files).find(candidate =>
      candidate.type.startsWith("image/")
    );
    if (!file) return;
    event.preventDefault();
    void uploadImage(file);
  }

  function dropImage(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const file = Array.from(event.dataTransfer.files).find(candidate =>
      candidate.type.startsWith("image/")
    );
    void uploadImage(file);
  }

  function removeImage(imageId: string) {
    startDeleting(async () => {
      const result = await deleteEntryImageAction(imageId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section
      className="rounded-xl border border-border/80 bg-card/70 p-5 hairline-top sm:p-6"
      tabIndex={0}
      onPaste={pasteImage}
      onDragOver={event => event.preventDefault()}
      onDrop={dropImage}
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Reference images
          </h2>
          <p className="mt-1 max-w-prose text-sm leading-6 text-muted-foreground">
            Private ImageKit assets, visible only through signed links in your
            journal. You can upload directly, paste here, or drop an image onto
            this panel.
          </p>
        </div>
        <div>
          <Label htmlFor="reference-image" className="sr-only">
            Upload reference image
          </Label>
          <Input
            ref={inputRef}
            id="reference-image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={event => uploadImage(event.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <UploadCloud />
            )}
            {uploading ? "Uploading" : "Add image"}
          </Button>
        </div>
      </div>
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      {images.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map(image => (
            <figure
              key={image.id}
              className="group relative overflow-hidden rounded-lg border border-border bg-muted"
            >
              <img
                src={image.signedUrl}
                alt={image.altText ?? "Reference image"}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <figcaption className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {image.altText ?? "Reference image"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeImage(image.id)}
                  disabled={isDeleting}
                  aria-label="Remove reference image"
                >
                  {isDeleting ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Trash2 />
                  )}
                </Button>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="mt-5 grid min-h-40 place-items-center rounded-lg border border-dashed border-border bg-muted/30 px-5 text-center">
          <div>
            <ImagePlus className="mx-auto size-5 text-muted-foreground" />
            <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
              Attach diagrams, screenshots, or visual references that support
              these notes.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

