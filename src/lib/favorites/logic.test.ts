import { describe, expect, it } from 'vitest';
import { MAX_FAVORITES, changedSince, fromRows, isFavorite, list, merge, parse, reconcile, toRows, toggle, type Favorites } from './logic';

const T = Date.parse('2026-10-02T12:00:00Z');

describe('toggle', () => {
  it('stars a tool and unstars it again, keeping the removal', () => {
    const starred = toggle({}, 'jwt', T);
    expect(starred).toEqual({ jwt: { starred: true, at: T } });
    expect(isFavorite(starred, 'jwt')).toBe(true);
    const removed = toggle(starred, 'jwt', T + 5000);
    expect(removed).toEqual({ jwt: { starred: false, at: T + 5000 } });
    expect(isFavorite(removed, 'jwt')).toBe(false);
  });

  it('does not change its input', () => {
    const before: Favorites = { jwt: { starred: true, at: T } };
    toggle(before, 'jwt', T + 1);
    expect(before).toEqual({ jwt: { starred: true, at: T } });
  });

  it('still moves forward when the clock was set back', () => {
    const starred = toggle({}, 'jwt', T);
    expect(toggle(starred, 'jwt', T - 60_000).jwt).toEqual({ starred: false, at: T + 1 });
  });

  it('ignores a slug that could not be a tool', () => {
    for (const bad of ['', 'JWT', 'a b', '../x', '-a', 'a--b', 'x'.repeat(65)]) expect(toggle({}, bad, T)).toEqual({});
  });
});

describe('list', () => {
  it('gives the starred slugs, oldest first', () => {
    const favorites: Favorites = { json: { starred: true, at: T + 2 }, jwt: { starred: true, at: T }, diff: { starred: false, at: T + 1 } };
    expect(list(favorites)).toEqual(['jwt', 'json']);
  });
});

describe('merge', () => {
  const phone: Favorites = { jwt: { starred: true, at: T }, json: { starred: true, at: T + 10 } };
  const laptop: Favorites = { jwt: { starred: false, at: T + 20 }, regex: { starred: true, at: T + 5 } };

  it('takes the last change per tool, so a removal on one device reaches the other', () => {
    expect(merge(phone, laptop)).toEqual({ jwt: { starred: false, at: T + 20 }, json: { starred: true, at: T + 10 }, regex: { starred: true, at: T + 5 } });
  });

  it('gives the same result in either order, and merging twice changes nothing', () => {
    const once = merge(phone, laptop);
    expect(merge(laptop, phone)).toEqual(once);
    expect(merge(once, laptop)).toEqual(once);
    expect(merge(once, phone)).toEqual(once);
  });

  it('lets a star win from a removal made in the same millisecond', () => {
    const a: Favorites = { jwt: { starred: true, at: T } };
    const b: Favorites = { jwt: { starred: false, at: T } };
    expect(merge(a, b).jwt.starred).toBe(true);
    expect(merge(b, a).jwt.starred).toBe(true);
  });
});

describe('changedSince', () => {
  it('gives only what the cloud is missing or has an older version of', () => {
    const local: Favorites = { jwt: { starred: false, at: T + 20 }, json: { starred: true, at: T }, regex: { starred: true, at: T } };
    const cloud: Favorites = { jwt: { starred: true, at: T }, json: { starred: true, at: T }, regex: { starred: false, at: T + 30 } };
    expect(changedSince(local, cloud)).toEqual({ jwt: { starred: false, at: T + 20 } });
    expect(changedSince(local, {})).toEqual(local);
    expect(changedSince(local, local)).toEqual({});
  });
});

describe('reconcile', () => {
  const local: Favorites = { jwt: { starred: true, at: T + 10 } };
  const cloud: Favorites = { json: { starred: true, at: T } };

  it('adds favourites made while signed out to the account', () => {
    for (const owner of ['none', 'self'] as const) {
      expect(reconcile({ local, cloud, owner })).toEqual({ merged: { ...cloud, ...local }, push: local });
    }
  });

  it('does not hand the favourites of another account to the user who signs in', () => {
    expect(reconcile({ local, cloud, owner: 'other' })).toEqual({ merged: cloud, push: {} });
  });
});

describe('parse', () => {
  it('keeps valid marks and drops everything else', () => {
    const raw = {
      jwt: { starred: true, at: T },
      'json-to-ts': { starred: false, at: T, extra: 'ignored' },
      'Not A Slug': { starred: true, at: T },
      regex: { starred: 'yes', at: T },
      diff: { starred: true, at: 'now' },
      hash: { starred: true, at: Number.NaN },
      uuid: null
    };
    expect(parse(raw)).toEqual({ jwt: { starred: true, at: T }, 'json-to-ts': { starred: false, at: T } });
  });

  it('survives anything storage can hold', () => {
    for (const junk of [null, undefined, 'text', 42, [], [{ starred: true, at: T }]]) expect(parse(junk)).toEqual({});
  });

  it('keeps the most recent changes when there are too many', () => {
    const many = Object.fromEntries(Array.from({ length: MAX_FAVORITES + 20 }, (_, i) => [`tool-${i}`, { starred: true, at: T + i }]));
    const kept = parse(many);
    expect(Object.keys(kept)).toHaveLength(MAX_FAVORITES);
    expect(kept['tool-0']).toBeUndefined();
    expect(kept[`tool-${MAX_FAVORITES + 19}`]).toBeDefined();
  });
});

describe('rows', () => {
  it('goes to database rows and back without losing anything', () => {
    const favorites: Favorites = { jwt: { starred: true, at: T }, json: { starred: false, at: T + 1234 } };
    expect(toRows(favorites)).toContainEqual({ slug: 'jwt', starred: true, changed_at: '2026-10-02T12:00:00.000Z' });
    expect(fromRows(toRows(favorites))).toEqual(favorites);
  });

  it('reads the timestamps Postgres returns, and skips rows it cannot read', () => {
    expect(
      fromRows([
        { slug: 'jwt', starred: true, changed_at: '2026-10-02T12:00:00.123456+00:00' },
        { slug: 'json', starred: true, changed_at: 'not a date' }
      ])
    ).toEqual({ jwt: { starred: true, at: T + 123 } });
  });
});
