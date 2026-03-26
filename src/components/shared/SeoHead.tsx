import { useEffect } from "react";

interface SeoHeadProps {
  title: string;
  description: string;
  path: string;
  type?: string;
  image?: string;
}

const BASE_URL = "https://cml.pl";
const OG_IMAGE = `${BASE_URL}/og-image.png`;

const SeoHead = ({ title, description, path, type = "article", image }: SeoHeadProps) => {
  useEffect(() => {
    const fullTitle = `${title} | CML – Centrum Medycyny Laserowej`;
    const url = `${BASE_URL}${path}`;
    const ogImage = image || OG_IMAGE;
    const fullTitle = `${title} | CML – Centrum Medycyny Laserowej`;
    const url = `${BASE_URL}${path}`;

    document.title = fullTitle;

    const metaTags: Record<string, string> = {
      description,
      "og:title": title,
      "og:description": description,
      "og:type": type,
      "og:url": url,
      "og:image": OG_IMAGE,
      "og:site_name": "CML – Centrum Medycyny Laserowej",
      "og:locale": "pl_PL",
      "twitter:card": "summary_large_image",
      "twitter:title": title,
      "twitter:description": description,
      "twitter:image": OG_IMAGE,
    };

    const createdElements: HTMLElement[] = [];

    Object.entries(metaTags).forEach(([key, value]) => {
      const isOg = key.startsWith("og:");
      const isTwitter = key.startsWith("twitter:");
      const attr = isOg || isTwitter ? "property" : "name";

      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
        createdElements.push(el);
      }
      el.setAttribute("content", value);
    });

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const createdCanonical = !canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);

    return () => {
      // Restore defaults on unmount
      document.title = "CML – Centrum Medycyny Laserowej | Warszawa, Siedlce";
      createdElements.forEach((el) => el.remove());

      // Restore canonical
      if (createdCanonical && canonical) {
        canonical.remove();
      } else if (canonical) {
        canonical.setAttribute("href", BASE_URL);
      }

      // Restore default meta description
      const descMeta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (descMeta) {
        descMeta.setAttribute("content", "Innowacyjne leczenie laserowe hemoroidów, żylaków i przetok w klinikach premium. Skuteczność, empatia, zaufanie. Umów konsultację.");
      }
    };
  }, [title, description, path, type]);

  return null;
};

export default SeoHead;
