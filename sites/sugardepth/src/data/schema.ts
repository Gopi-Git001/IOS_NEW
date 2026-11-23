import { APP_URL, ORG, SITE_NAME, SITE_URL, TAGLINE, abs } from '../config';

export const ORG_ID = `${SITE_URL}/#organization`;
export const SITE_ID = `${SITE_URL}/#website`;
export const APP_ID = `${SITE_URL}/#app`;

export const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': ORG_ID,
  name: ORG.name,
  url: SITE_URL,
  email: ORG.email,
  address: { '@type': 'PostalAddress', addressLocality: ORG.locality, addressRegion: ORG.region, addressCountry: ORG.country },
  brand: { '@type': 'Brand', name: SITE_NAME, slogan: TAGLINE },
};

export const website = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': SITE_ID,
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: 'en-US',
  publisher: { '@id': ORG_ID },
};

export const webApplication = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  '@id': APP_ID,
  name: SITE_NAME,
  url: APP_URL,
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Web browser',
  browserRequirements: 'Requires a camera and a modern web browser.',
  description:
    'Sugar Depth reads the ingredient list in a photo of a food label and gives one verdict: CLEAN, OKAY or BAD, based on added sugars and sweeteners. It does not use barcodes or a product database.',
  featureList: [
    'Reads the printed ingredient list from a photo',
    'Flags added sugars under any of their label names',
    'Flags artificial sweeteners, sugar alcohols and plant sweeteners',
    'Asks for a retake when the list is cut off or unreadable',
  ],
  publisher: { '@id': ORG_ID },
};

export const breadcrumbs = (items: { name: string; href: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.href) })),
});
