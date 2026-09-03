import { useEffect } from "react";

export function PageMeta({ title, description }) {
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
      ?.setAttribute("content", "website");
  }, [description, title]);
  return null;
}
