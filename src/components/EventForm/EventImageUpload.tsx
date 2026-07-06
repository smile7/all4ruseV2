"use client";

import { useCallback } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { useTranslations } from "next-intl";

import { ImagePlus, X } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

export type UploadableImage = {
  id: string;
  file?: File;
  previewUrl: string;
  storedPath?: string;
};

type Props = {
  images: UploadableImage[];
  onChange: (images: UploadableImage[]) => void;
};

export function EventImageUpload({ images, onChange }: Props) {
  const t = useTranslations("CreateEvent");

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const remaining = MAX_IMAGES - images.length;
      if (remaining <= 0) return;

      const newImages: UploadableImage[] = acceptedFiles
        .slice(0, remaining)
        .map((file) => ({
          id: `new-${Math.random().toString(36).slice(2)}`,
          file,
          previewUrl: URL.createObjectURL(file),
        }));

      onChange([...images, ...newImages]);
    },
    [images, onChange],
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: {
        "image/jpeg": [".jpg", ".jpeg"],
        "image/png": [".png"],
        "image/webp": [".webp"],
        "image/gif": [".gif"],
      },
      maxSize: MAX_FILE_SIZE,
      disabled: images.length >= MAX_IMAGES,
    });

  const hasSizeError = (fileRejections as FileRejection[]).some((r) =>
    r.errors.some((e) => e.code === "file-too-large"),
  );

  function handleRemove(id: string) {
    const img = images.find((i) => i.id === id);
    if (img?.file) URL.revokeObjectURL(img.previewUrl);
    onChange(images.filter((i) => i.id !== id));
  }

  function handleMakeCover(id: string) {
    const idx = images.findIndex((i) => i.id === id);
    if (idx <= 0) return;
    const next = [...images];
    const [item] = next.splice(idx, 1);
    next.unshift(item!);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {images.length < MAX_IMAGES && (
        <div
          {...getRootProps()}
          className={cn(
            "cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all duration-200",
            isDragActive
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
          )}
        >
          <input {...getInputProps()} />
          <ImagePlus className="text-muted-foreground mx-auto mb-3 size-8" />
          <p className="text-sm font-medium">
            {isDragActive ? t("uploadImageDrop") : t("uploadImages")}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("uploadImagesInfo")}
          </p>
        </div>
      )}

      {hasSizeError && (
        <p className="text-destructive text-sm">{t("maxImageSizeExceeded")}</p>
      )}
      {images.length >= MAX_IMAGES && (
        <p className="text-muted-foreground text-sm">
          {t("maxImagesExceeded")}
        </p>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {images.map((img, index) => (
            <div
              key={img.id}
              className="bg-muted relative aspect-square overflow-hidden rounded-md"
            >
              {/*
               * img.previewUrl is always a blob: URL created with
               * URL.createObjectURL(file). next/image cannot optimise blob URLs,
               * so we use a plain <img> here intentionally.
               */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.previewUrl}
                alt={index === 0 ? t("coverImageAlt") : t("eventImageAlt")}
                className="h-full w-full object-cover"
              />

              <button
                type="button"
                aria-label={t("removeImageAria")}
                onClick={() => handleRemove(img.id)}
                className="absolute top-1 right-1 z-10 cursor-pointer rounded-full bg-black/35 p-1 text-white/85 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
              >
                <X className="size-3" />
              </button>

              {index !== 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    type="button"
                    aria-label={t("makeCoverAria")}
                    onClick={() => handleMakeCover(img.id)}
                    className="cursor-pointer rounded-md bg-black/40 px-2 py-1 text-xs text-white/90 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
                  >
                    {t("makeCover")}
                  </button>
                </div>
              )}

              {index === 0 && (
                <Badge className="absolute bottom-1 left-1 py-0 text-xs">
                  {t("cover")}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
