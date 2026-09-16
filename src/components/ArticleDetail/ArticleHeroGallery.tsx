import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  title: string;
};

export function ArticleHeroGallery({ src, alt, title }: Props) {
  return (
    <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-xl">
      {/* Blurred background — fills letterbox gaps */}
      <Image
        src={src}
        alt=""
        fill
        aria-hidden
        tabIndex={-1}
        sizes="(min-width: 768px) 768px, 100vw"
        className="scale-110 object-cover blur-2xl brightness-75 saturate-150"
      />
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 768px) 768px, 100vw"
        priority
        className="z-10 object-contain"
      />
      {/* Transparent overlay; ArticleImageLightbox opens the full-screen zoom. */}
      <a
        href={src}
        className="article-lightbox absolute inset-0 z-20 block cursor-zoom-in"
        aria-label={alt || title}
      />
    </div>
  );
}
