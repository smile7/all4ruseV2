"use client";

import type { ReactNode } from "react";

import lgZoom from "lightgallery/plugins/zoom";
import LightGallery from "lightgallery/react";

import "lightgallery/css/lightgallery.css";
import "lightgallery/css/lg-zoom.css";

type Props = {
  children: ReactNode;
};

export function ArticleImageLightbox({ children }: Props) {
  return (
    <LightGallery
      plugins={[lgZoom]}
      speed={400}
      selector="a.article-lightbox"
    >
      {children}
    </LightGallery>
  );
}
