// This module contains utilities for handling the site's locale.
import type { Locale } from '@ircsignpost/signpost-base/dist/src/locale';

import { DYNAMIC_CONTENT_LOCALES } from './constants';

export { Locale };

// Keep LOCALES and 'getLocaleFromCode' in sync with locales configured in /next.config.js.
export const LOCALES: { [key: string]: Locale } = {
  fr-HT: {
    url: 'fr-HT',
    direction: 'ltr',
    name: 'Kreyòl',
    directus: 'ht',
  },
  es: { url: 'es', direction: 'ltr', name: 'Español', directus: 'es' },
};

export const LOCALE_CODES_TO_CANONICAL_LOCALE_CODES: { [key: string]: string } =
  {
    'fr-HT': 'fr-HT',
    'es': 'es',
  };

// Returns the effective locale given locale code.
//
// This function defaults to en-us in case we end up in a situation where the locale is not recognized. It's defensive programming as this shouldn't happen.
export function getLocaleFromCode(code: string): Locale {
  return LOCALES[code] ?? LOCALES['ht'];
}

/* Returns a Zendesk locale id for the current locale.
 If there is no mapping for the requested locale, return the default id 
 for en-us locale. */
export const getZendeskLocaleId = (currentLocale: Locale): number => {
  return DYNAMIC_CONTENT_LOCALES[currentLocale.url] || 16;
};
