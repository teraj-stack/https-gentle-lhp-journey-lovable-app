import { CSSProperties } from "react";

/**
 * Shape returned by `vite-imagetools` when using the `?as=picture` directive.
 * Each source is a preformatted `srcset` string like `"foo-480.avif 480w, foo-720.avif 720w"`.
 */
export interface PictureImport {
  sources: Record<string, string>;
  img: { src: string; w: number; h: number };
}

interface ResponsiveImageProps {
  /** Result of `import x from "@/assets/foo.webp?..."&as=picture"` */
  picture: PictureImport;
  alt: string;
  /** Native `sizes` attribute — required for the browser to pick correctly. */
  sizes: string;
  className?: string;
  imgClassName?: string;
  style?: CSSProperties;
  /**
   * Treat as LCP candidate: eager load + high fetch priority.
   * Otherwise lazy load with async decoding.
   */
  priority?: boolean;
}

/**
 * Renders a <picture> with AVIF + WebP sources and a fallback <img>.
 * Width/height come from the imagetools metadata so CLS stays at 0.
 */
const ResponsiveImage = ({
  picture,
  alt,
  sizes,
  className,
  imgClassName,
  style,
  priority = false,
}: ResponsiveImageProps) => {
  const { sources, img } = picture;
  // Deterministic order: AVIF first (smallest), then WebP fallback.
  const orderedTypes: Array<[string, string]> = [
    ["avif", "image/avif"],
    ["webp", "image/webp"],
    ["jpeg", "image/jpeg"],
    ["jpg", "image/jpeg"],
    ["png", "image/png"],
  ];

  return (
    <picture className={className} style={style}>
      {orderedTypes
        .filter(([key]) => sources[key])
        .map(([key, type]) => (
          <source key={key} type={type} srcSet={sources[key]} sizes={sizes} />
        ))}
      <img
        src={img.src}
        width={img.w}
        height={img.h}
        alt={alt}
        sizes={sizes}
        className={imgClassName}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        {...(priority ? { fetchPriority: "high" as const } : {})}
      />
    </picture>
  );
};

export default ResponsiveImage;
