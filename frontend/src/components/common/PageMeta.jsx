import { useEffect } from "react";

export function PageMeta({
  title,
  description,
  image,
  type = "website",
  noindex = false,
  structuredData = null,
}) {
  useEffect(() => {
    const fullTitle = `${title} | Brinco de Princesa`;
    document.title = fullTitle;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", description);
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute("content", fullTitle);
    document
      .querySelector('meta[property="og:description"]')
      ?.setAttribute("content", description);
    document
      .querySelector('meta[property="og:type"]')
      ?.setAttribute("content", type);
    const siteUrl = (
      import.meta.env.VITE_SITE_URL || window.location.origin
    ).replace(/\/$/, "");
    const canonicalUrl = `${siteUrl}${window.location.pathname}`;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = canonicalUrl;
    const setMeta = (selector, attribute, value) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement("meta");
        const match = selector.match(/meta\[(name|property)="([^"]+)"\]/);
        element.setAttribute(match[1], match[2]);
        document.head.append(element);
      }
      element.setAttribute(attribute, value);
    };
    setMeta(
      'meta[name="robots"]',
      "content",
      noindex ? "noindex,nofollow" : "index,follow",
    );
    setMeta('meta[property="og:url"]', "content", canonicalUrl);
    if (image)
      setMeta(
        'meta[property="og:image"]',
        "content",
        new URL(image, siteUrl).href,
      );
    setMeta(
      'meta[name="twitter:card"]',
      "content",
      image ? "summary_large_image" : "summary",
    );
    setMeta('meta[name="twitter:title"]', "content", fullTitle);
    setMeta('meta[name="twitter:description"]', "content", description);
    document.querySelector("script[data-page-structured-data]")?.remove();
    if (structuredData) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.pageStructuredData = "true";
      script.textContent = JSON.stringify(structuredData).replace(
        /</g,
        "\\u003c",
      );
      document.head.append(script);
    }
    return () =>
      document.querySelector("script[data-page-structured-data]")?.remove();
  }, [description, image, noindex, structuredData, title, type]);
  return null;
}
