// Clickable example reads shown under the input — a one-tap way to feel the
// product before you have a link of your own. Localized per market: each locale
// surfaces brands that resonate there (and that actually return a read). Labels
// are brand names (data, not translated); URLs are real product/brand pages.

import type { Locale } from "@/lib/i18n/config";

export interface Example {
  label: string;
  url: string;
}

export const EXAMPLES_BY_LOCALE: Record<Locale, Example[]> = {
  // US / UK / global English
  en: [
    { label: "American Giant", url: "https://www.american-giant.com/" },
    { label: "Buck Mason", url: "https://buckmason.com/" },
    {
      label: "Norse Projects",
      url: "https://norseprojects.com/products/norse-standard-heavy-loose-t-shirt-white",
    },
    { label: "Asket", url: "https://www.asket.com/en-pl/mens-t-shirt-white" },
  ],
  // Brazil
  "pt-BR": [
    { label: "Insider", url: "https://insiderstore.com.br/" },
    {
      label: "Renner",
      url: "https://www.lojasrenner.com.br/p/camisa-manga-longa-em-sarja-com-bolsos-frontais/-/A-930437583-COR930437583-19-1116TCX.br.lr?sku=930437591",
    },
    { label: "Dudalina", url: "https://www.dudalina.com.br/" },
  ],
  // Germany
  de: [
    {
      label: "Merz b. Schwanen",
      url: "https://www.merzbschwanen.com/products/workers-cotton-twill-long-sleeve-shirt",
    },
    { label: "SANVT", url: "https://sanvt.com/products/the-perfect-t-shirt-white" },
    { label: "UNIQLO", url: "https://www.uniqlo.com/de/de/products/E483461-000" },
    {
      label: "Zara",
      url: "https://www.zara.com/de/de/boxy-fit-check-shirt-p01820350.html",
    },
  ],
  // Spain
  es: [
    {
      label: "Zara",
      url: "https://www.zara.com/es/es/boxy-fit-check-shirt-p01820350.html",
    },
    { label: "Pompeii", url: "https://pompeiibrand.com/" },
    { label: "Silbon", url: "https://silbonshop.com/" },
  ],
};
