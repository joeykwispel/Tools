import { describe, expect, it } from 'vitest';
import { DECKS, NOT_ESTIMATES, deckOf, numberOf, summarise } from './logic';

const fibonacci = deckOf('fibonacci');
const shirts = deckOf('shirts');

describe('decks', () => {
  it('have cards that are all different, and end with the two that are not an estimate', () => {
    for (const deck of DECKS) {
      expect(new Set(deck.cards).size, deck.id).toBe(deck.cards.length);
      expect(deck.cards.slice(-2), deck.id).toEqual(NOT_ESTIMATES);
    }
    expect(new Set(DECKS.map((deck) => deck.id)).size).toBe(DECKS.length);
  });

  it('fall back on the first deck for an id that is not known', () => {
    expect(deckOf('shirts').id).toBe('shirts');
    expect(deckOf('gone').id).toBe('fibonacci');
    expect(deckOf(null).id).toBe('fibonacci');
  });

  it('know the number on a card', () => {
    expect(['0', '13', '½', '100', 'XL', '?', '☕'].map(numberOf)).toEqual([0, 13, 0.5, 100, null, null, null]);
  });
});

describe('summarise', () => {
  it('counts the cards in the order of the deck', () => {
    expect(summarise(['8', '3', '5', '5', '?', '3', '5'], fibonacci)).toEqual({
      votes: 7,
      counts: [
        ['3', 2],
        ['5', 3],
        ['8', 1],
        ['?', 1]
      ],
      low: '3',
      high: '8',
      consensus: false,
      average: 4.8
    });
  });

  it('sees when everyone agrees', () => {
    expect(summarise(['5', '5', '5'], fibonacci)).toMatchObject({ consensus: true, low: '5', high: '5', average: 5 });
    // a question mark is not a disagreement, and one card is not an agreement
    expect(summarise(['5', '5', '?'], fibonacci).consensus).toBe(true);
    expect(summarise(['5'], fibonacci).consensus).toBe(false);
    expect(summarise(['?', '☕'], fibonacci)).toMatchObject({ votes: 2, consensus: false, low: null, high: null, average: null });
  });

  it('has no average for a deck without numbers', () => {
    expect(summarise(['S', 'XL', 'M'], shirts)).toMatchObject({ low: 'S', high: 'XL', average: null, consensus: false });
    expect(summarise(['½', '1'], deckOf('modified')).average).toBe(0.8);
  });

  it('leaves out cards that are not in the deck', () => {
    expect(summarise(['XL', '5', '4'], fibonacci)).toMatchObject({ votes: 1, counts: [['5', 1]] });
    expect(summarise([], fibonacci)).toEqual({ votes: 0, counts: [], low: null, high: null, consensus: false, average: null });
  });
});
