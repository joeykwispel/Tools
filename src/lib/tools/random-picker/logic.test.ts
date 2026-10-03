import { describe, expect, it } from 'vitest';
import { groups, namesOf, pickOne, shuffle, waiting, type Pick } from './logic';

const always =
  (value: number): Pick =>
  (below) =>
    Math.min(value, below - 1);
/** The same numbers in every run, and spread well enough to count with (mulberry32). */
const seeded = (seed = 1): Pick => {
  let state = seed;
  return (below) => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * below);
  };
};
const TEAM = ['Ada', 'Grace', 'Linus', 'Margaret', 'Dennis'];

describe('namesOf', () => {
  it('reads one name per line', () => {
    expect(namesOf(' Ada \n\nGrace Hopper\n   \nLinus\n')).toEqual(['Ada', 'Grace Hopper', 'Linus']);
    expect(namesOf('')).toEqual([]);
    expect(namesOf('Ada\nAda')).toEqual(['Ada', 'Ada']);
  });
});

describe('shuffle', () => {
  it('keeps everyone, and leaves the list given as it is', () => {
    const pick = seeded();
    for (let i = 0; i < 100; i++) expect([...shuffle(TEAM, pick)].sort()).toEqual([...TEAM].sort());
    expect(TEAM[0]).toBe('Ada');
    expect(shuffle([], pick)).toEqual([]);
    expect(shuffle(['Ada'], pick)).toEqual(['Ada']);
  });

  it('follows the numbers it is given', () => {
    // always the last one that is left: nothing moves
    expect(shuffle(TEAM, (below) => below - 1)).toEqual(TEAM);
    expect(shuffle(['a', 'b', 'c'], always(0))).toEqual(['b', 'c', 'a']);
  });

  it('puts everyone in every place about as often', () => {
    const pick = seeded(42);
    const first: Record<string, number> = {};
    for (let i = 0; i < 5000; i++) {
      const name = shuffle(TEAM, pick)[0];
      first[name] = (first[name] ?? 0) + 1;
    }
    for (const name of TEAM) expect(first[name], name).toBeGreaterThan(800);
  });
});

describe('pickOne', () => {
  it('picks nobody twice until everyone has been, then starts over', () => {
    const pick = seeded(7);
    let picked: string[] = [];
    const round: string[] = [];
    for (let i = 0; i < TEAM.length; i++) {
      const result = pickOne(TEAM, picked, pick)!;
      round.push(result.name);
      picked = result.picked;
    }
    expect([...round].sort()).toEqual([...TEAM].sort());
    expect(picked).toEqual(round);
    const again = pickOne(TEAM, picked, pick)!;
    expect(again.picked).toEqual([again.name]);
  });

  it('counts a name as often as it is in the list', () => {
    expect(waiting(['Ada', 'Ada', 'Grace'], ['Ada'])).toEqual(['Ada', 'Grace']);
    expect(waiting(['Ada', 'Grace'], ['Ada', 'Zed'])).toEqual(['Grace']);
    expect(pickOne(['Ada', 'Ada'], ['Ada'], always(0))).toEqual({ name: 'Ada', picked: ['Ada', 'Ada'] });
  });

  it('forgets a name that was picked and then taken off the list', () => {
    expect(pickOne(['Ada', 'Grace'], ['Linus', 'Ada'], always(0))).toEqual({ name: 'Grace', picked: ['Linus', 'Ada', 'Grace'] });
  });

  it('can pick anyone every time when that is asked', () => {
    expect(pickOne(TEAM, ['Ada'], always(0), false)).toEqual({ name: 'Ada', picked: [] });
  });

  it('gives null when there is nobody', () => {
    expect(pickOne([], [], always(0))).toBeNull();
  });
});

describe('groups', () => {
  it('deals everyone over groups that differ by one at most', () => {
    const made = groups(TEAM, 2, seeded(3));
    expect(made.map((group) => group.length)).toEqual([3, 2]);
    expect(made.flat().sort()).toEqual([...TEAM].sort());
    expect(groups(['a', 'b', 'c', 'd', 'e', 'f', 'g'], 3, seeded()).map((group) => group.length)).toEqual([3, 2, 2]);
  });

  it('makes no more groups than there are names, and at least one', () => {
    expect(groups(['a', 'b'], 5, seeded())).toHaveLength(2);
    expect(groups(TEAM, 0, seeded())).toHaveLength(1);
    expect(groups(TEAM, NaN, seeded())).toHaveLength(1);
    expect(groups(TEAM, 2.9, seeded())).toHaveLength(2);
    expect(groups([], 3, seeded())).toEqual([]);
  });
});
