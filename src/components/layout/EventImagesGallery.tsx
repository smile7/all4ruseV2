"use client";

import Image from "next/image";

import lgThumbnail from "lightgallery/plugins/thumbnail";
import lgZoom from "lightgallery/plugins/zoom";
import LightGallery from "lightgallery/react";

import "lightgallery/css/lightgallery.css";
import "lightgallery/css/lg-zoom.css";
import "lightgallery/css/lg-thumbnail.css";

export function EventImagesGallery({ images }: { images: string[] }) {
  if (images.length === 0) return null;

  return (
    <div className="mt-8">
      <LightGallery
        plugins={[lgZoom, lgThumbnail]}
        elementClassNames="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
      >
        {images.map((url, i) => (
          <a key={i} href={url} className="block">
            <div className="relative aspect-square overflow-hidden rounded-md">
              <Image
                src={url}
                alt=""
                fill
                className="object-cover transition-opacity hover:opacity-90"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              />
            </div>
          </a>
        ))}
      </LightGallery>
    </div>
  );
}
