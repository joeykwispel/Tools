/**
 * Planning poker without a server: the decks, and what a round of cards says. Everyone picks on their own screen and
 * shows it at the same time; someone can tally the cards that were shown to see how far apart they are.
 */

export interface Deck {
  id: string;
  cards: string[];
}

/** "No idea" and "I need a break": cards that are not an estimate. */
export const NOT_ESTIMATES = ['?', '☕'];

export const DECKS: Deck[] = [
  { id: 'fibonacci', cards: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '?', '☕'] },
  { id: 'modified', cards: ['0', '½', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕'] },
  { id: 'powers', cards: ['1', '2', '4', '8', '16', '32', '64', '?', '☕'] },
  { id: 'shirts', cards: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'] }
];

/** The deck with this id, or the first one for an id that is not known (what was saved may be old). */
export const deckOf = (id: string | null) => DECKS.find((deck) => deck.id === id) ?? DECKS[0];

/** The number on a card, or null for a card without one. */
export function numberOf(card: string): number | null {
  if (card === '½') return 0.5;
  return /^\d+$/.test(card) ? Number(card) : null;
}

export interface Summary {
  /** How many cards were shown, the ones that are not an estimate included */
  votes: number;
  /** Each card that was shown and how often, in the order of the deck */
  counts: [card: string, times: number][];
  /** The lowest and highest estimate; null when nobody gave one */
  low: string | null;
  high: string | null;
  /** More than one estimate, and all the same */
  consensus: boolean;
  /** The mean of the estimates, to one decimal; null for a deck without numbers */
  average: number | null;
}

/** What a round says. Cards that are not in the deck are left out. */
export function summarise(votes: string[], deck: Deck): Summary {
  const shown = votes.filter((card) => deck.cards.includes(card));
  const counts = deck.cards.map((card): [string, number] => [card, shown.filter((vote) => vote === card).length]).filter(([, times]) => times > 0);
  const estimates = counts.filter(([card]) => !NOT_ESTIMATES.includes(card));
  const given = shown.filter((card) => !NOT_ESTIMATES.includes(card));
  const numbers = given.map(numberOf);
  const sum = numbers.reduce<number>((total, value) => total + (value ?? 0), 0);
  return {
    votes: shown.length,
    counts,
    low: estimates[0]?.[0] ?? null,
    high: estimates.at(-1)?.[0] ?? null,
    consensus: given.length > 1 && estimates.length === 1,
    average: given.length && numbers.every((value) => value !== null) ? Math.round((sum / given.length) * 10) / 10 : null
  };
}
