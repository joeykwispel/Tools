export type Locale = 'en' | 'nl';

/** Text in both languages. */
export type Localized = Record<Locale, string>;

/** A link in the header menu. */
export interface HeaderLink {
  label: string;
  href: string;
  current?: boolean;
}
