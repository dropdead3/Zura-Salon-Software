import { Helmet } from 'react-helmet-async';
import { PLATFORM_NAME } from '@/lib/brand';

interface MarketingSEOProps {
  title: string;
  description: string;
  image?: string;
  path?: string;
}

const BASE_URL = 'https://getzura.com';

export function MarketingSEO({ title, description, image, path = '' }: MarketingSEOProps) {
  const fullTitle = `${title} — ${PLATFORM_NAME}`;
  const url = `${BASE_URL}${path}`;
  const ogImage = image || `${BASE_URL}/og-default.png`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={PLATFORM_NAME} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
