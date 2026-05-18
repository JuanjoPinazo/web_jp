import React from 'react';
import { DossierData } from './dossier-builder';
import { PremiumTravelDossierEmail } from './templates/PremiumTravelDossierEmail';

// Export for backwards compatibility if needed, using the new premium template
export const TravelDossierEmail: React.FC<{ data: DossierData; siteUrl: string }> = ({ data, siteUrl }) => {
  return React.createElement(PremiumTravelDossierEmail, { data, siteUrl });
};

// Main function to render TSX template to static HTML
export async function renderTravelDossierEmailHtml(data: DossierData, siteUrl: string): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const element = React.createElement(PremiumTravelDossierEmail, { data, siteUrl });
  const markup = renderToStaticMarkup(element);
  
  // Return completed HTML structure with standard doctype
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dossier Logístico Exclusivo</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0A0E1A;">
  ${markup}
</body>
</html>`;
}
