export const getLogoUrl = (logoPath, defaultLogo) => {
  if (!logoPath) return defaultLogo;
  if (logoPath.startsWith('http')) return logoPath;
  if (logoPath.startsWith('/uploads')) return logoPath; // Use relative path for proxy
  if (logoPath.startsWith('/Uploads')) return `http://localhost:5000${logoPath}`;
  return logoPath;
};