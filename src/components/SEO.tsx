import { Helmet } from "react-helmet-async";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "local_business";
}

// Generic fallback when no org data is available
const FALLBACK_BUSINESS = {
  name: "Salon",
  description: "Professional hair salon specializing in color, extensions, cutting & styling.",
  email: "",
  url: "",
  image: "/og-image.jpg",
  priceRange: "$$$",
};

export function SEO({
  title,
  description,
  image,
  url,
  type = "website",
}: SEOProps) {
  const { data: settings } = useBusinessSettings();

  const businessName = settings?.business_name || FALLBACK_BUSINESS.name;
  const businessDescription = description || FALLBACK_BUSINESS.description;
  const businessUrl = url || settings?.website || FALLBACK_BUSINESS.url;
  const businessImage = image || FALLBACK_BUSINESS.image;
  const businessEmail = settings?.email || FALLBACK_BUSINESS.email;

  const fullTitle = title
    ? `${title} | ${businessName}`
    : `${businessName} | Professional Hair Salon`;

  // Only generate structured data if we have real business info
  const hasBusinessData = !!settings;

  const organizationSchema = hasBusinessData
    ? {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: businessName,
        description: businessDescription,
        url: businessUrl,
        logo: businessImage,
        ...(businessEmail ? { email: businessEmail } : {}),
        ...(settings?.phone ? { telephone: settings.phone } : {}),
        sameAs: [],
      }
    : null;

  // Basic LocalBusiness schema from settings
  const localBusinessSchema =
    hasBusinessData && settings?.mailing_address
      ? {
          "@context": "https://schema.org",
          "@type": "HairSalon",
          name: businessName,
          description: businessDescription,
          image: businessImage,
          url: businessUrl,
          ...(settings?.phone ? { telephone: settings.phone } : {}),
          ...(businessEmail ? { email: businessEmail } : {}),
          priceRange: FALLBACK_BUSINESS.priceRange,
          address: {
            "@type": "PostalAddress",
            streetAddress: settings.mailing_address,
            addressLocality: settings.city || "",
            addressRegion: settings.state || "",
            postalCode: settings.zip || "",
            addressCountry: "US",
          },
        }
      : null;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={businessDescription} />

      {/* Canonical URL */}
      {businessUrl && <link rel="canonical" href={businessUrl} />}

      {/* Open Graph / Facebook */}
      <meta
        property="og:type"
        content={type === "local_business" ? "business.business" : type}
      />
      {businessUrl && <meta property="og:url" content={businessUrl} />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={businessDescription} />
      <meta property="og:image" content={businessImage} />
      <meta property="og:site_name" content={businessName} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      {businessUrl && <meta name="twitter:url" content={businessUrl} />}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={businessDescription} />
      <meta name="twitter:image" content={businessImage} />

      {/* Additional SEO */}
      <meta name="robots" content="index, follow" />
      <meta name="author" content={businessName} />

      {/* Structured Data - Organization (only if real data exists) */}
      {organizationSchema && (
        <script type="application/ld+json">
          {JSON.stringify(organizationSchema)}
        </script>
      )}

      {/* Structured Data - Local Business (only if address exists) */}
      {localBusinessSchema && (
        <script type="application/ld+json">
          {JSON.stringify(localBusinessSchema)}
        </script>
      )}
    </Helmet>
  );
}
