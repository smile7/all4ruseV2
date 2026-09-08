import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  title: string;
};

export function ArticleHeroGallery({ src, alt, title }: Props) {
  return (
    <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-xl">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 768px) 768px, 100vw"
        priority
        className="object-cover"
      />
      {/* Transparent overlay; ArticleImageLightbox opens the full-screen zoom. */}
      <a
        href={src}
        className="article-lightbox absolute inset-0 z-10 block cursor-zoom-in"
        aria-label={alt || title}
      />
    </div>
  );
}
