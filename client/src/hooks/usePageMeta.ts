import { useEffect } from 'react';

interface PageMeta {
  title: string;
  description: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
}

const BASE_URL = 'https://offerflow.ai';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

function setMetaTag(name: string, content: string, isProperty = false) {
  const attr = isProperty ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLinkTag(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function usePageMeta(meta: PageMeta) {
  useEffect(() => {
    // Title
    const prevTitle = document.title;
    document.title = meta.title;

    // Description
    setMetaTag('description', meta.description);

    // Canonical
    const canonicalUrl = meta.canonical || `${BASE_URL}${window.location.pathname}`;
    setLinkTag('canonical', canonicalUrl);

    // Open Graph
    setMetaTag('og:title', meta.ogTitle || meta.title, true);
    setMetaTag('og:description', meta.ogDescription || meta.description, true);
    setMetaTag('og:image', meta.ogImage || DEFAULT_OG_IMAGE, true);
    setMetaTag('og:type', meta.ogType || 'website', true);
    setMetaTag('og:url', canonicalUrl, true);
    setMetaTag('og:site_name', 'OfferFlow', true);

    // Twitter Card
    setMetaTag('twitter:card', meta.twitterCard || 'summary_large_image');
    setMetaTag('twitter:title', meta.ogTitle || meta.title);
    setMetaTag('twitter:description', meta.ogDescription || meta.description);
    setMetaTag('twitter:image', meta.ogImage || DEFAULT_OG_IMAGE);

    return () => {
      document.title = prevTitle;
    };
  }, [meta.title, meta.description, meta.canonical, meta.ogTitle, meta.ogDescription, meta.ogImage, meta.ogType, meta.twitterCard]);
}
