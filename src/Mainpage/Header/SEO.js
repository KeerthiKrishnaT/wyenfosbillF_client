// SEO.js
import React from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import './SEO.css';

const SEO = ({
  title = "WYENFOS BILLS - Professional Billing & Invoice Management",
  description = "WyenFos Bills - Streamline your business with professional billing, invoicing, and financial management solutions.",
  keywords = "billing software, invoice management, business finance, accounting, WyenFos, bills",
  author = "WyenFos Team",
  url = typeof window !== 'undefined' ? window.location.href : '',
  image = typeof window !== 'undefined' ? `${window.location.origin}/assets/images/Wyenfos_bills_logo.png` : '',
  type = "website",
  showBreadcrumb = false,
  breadcrumbItems = []
}) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "WyenFos Bills",
    "description": description,
    "url": url,
    "logo": image,
    "sameAs": []
  };

  return (
    <HelmetProvider>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <meta name="author" content={author} />
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta property="og:type" content={type} />
        <meta property="og:url" content={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={image} />
        <meta property="og:site_name" content="WyenFos Bills" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={url} />
        <meta property="twitter:title" content={title} />
        <meta property="twitter:description" content={description} />
        <meta property="twitter:image" content={image} />
        <meta name="theme-color" content="#b39eb5" />
        <meta name="msapplication-TileColor" content="#b39eb5" />
        <meta name="application-name" content="WyenFos Bills" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>
      {showBreadcrumb && breadcrumbItems.length > 0 && (
        <nav className="seo-breadcrumb" aria-label="Breadcrumb">
          <ol className="breadcrumb-list">
            {breadcrumbItems.map((item, index) => (
              <li key={index} className="breadcrumb-item">
                {index < breadcrumbItems.length - 1 ? (
                  <>
                    <a href={item.url} className="breadcrumb-link">{item.label}</a>
                    <span className="breadcrumb-separator" aria-hidden="true">/</span>
                  </>
                ) : (
                  <span className="breadcrumb-current" aria-current="page">{item.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
    </HelmetProvider>
  );
};

export default SEO;
