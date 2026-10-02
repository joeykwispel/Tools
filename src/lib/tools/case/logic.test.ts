import { describe, expect, it } from 'vitest';
import { CASES, EXAMPLES, convert, words, type Case } from './logic';

describe('words', () => {
  it('finds the words in every way a name is written', () => {
    for (const text of [
      'user profile id',
      'userProfileId',
      'UserProfileId',
      'user_profile_id',
      'USER_PROFILE_ID',
      'user-profile-id',
      'user.profile.id',
      'user/profile/id',
      '  User   Profile--Id! '
    ])
      expect(
        words(text).map((w) => w.toLowerCase()),
        text
      ).toEqual(['user', 'profile', 'id']);
  });

  it('keeps an acronym together, and splits it from the word after it', () => {
    expect(words('XMLHttpRequest')).toEqual(['XML', 'Http', 'Request']);
    expect(words('parseJSON')).toEqual(['parse', 'JSON']);
    expect(words('userID')).toEqual(['user', 'ID']);
    expect(words('HTTPSConnection2Go')).toEqual(['HTTPS', 'Connection', '2', 'Go']);
  });

  it('splits letters from digits', () => {
    expect(words('version2beta')).toEqual(['version', '2', 'beta']);
    expect(words('item_42')).toEqual(['item', '42']);
    expect(words('h1 h22')).toEqual(['h', '1', 'h', '22']);
  });

  it('keeps accented letters in their word', () => {
    expect(words('café crème_brûlée')).toEqual(['café', 'crème', 'brûlée']);
    expect(words('ÉcoleNationale')).toEqual(['École', 'Nationale']);
  });

  it('gives nothing for a text without letters or digits', () => {
    expect(words('')).toEqual([]);
    expect(words(' -_ ./ ')).toEqual([]);
  });
});

describe('convert', () => {
  const expected: Record<Case, string> = {
    camel: 'userProfileId',
    pascal: 'UserProfileId',
    snake: 'user_profile_id',
    constant: 'USER_PROFILE_ID',
    kebab: 'user-profile-id',
    train: 'User-Profile-Id',
    dot: 'user.profile.id',
    path: 'user/profile/id',
    title: 'User Profile Id',
    sentence: 'User profile id',
    lower: 'user profile id',
    upper: 'USER PROFILE ID'
  };

  it('writes a name in every case', () => {
    for (const to of Object.keys(CASES) as Case[]) expect(convert('user profile ID', to), to).toBe(expected[to]);
  });

  it('gives the same result whatever case the input was in', () => {
    for (const from of Object.values(expected)) for (const to of Object.keys(CASES) as Case[]) expect(convert(from, to), `${from} → ${to}`).toBe(expected[to]);
  });

  it('names each case in that case', () => {
    for (const [name, example] of Object.entries(EXAMPLES) as [Case, string][]) expect(convert(example, name), name).toBe(example);
  });

  it('converts every line on its own, and leaves lines without words as they are', () => {
    expect(convert('first name\nlast name\n\n---\ndate of birth', 'camel')).toBe('firstName\nlastName\n\n---\ndateOfBirth');
  });

  it('handles acronyms and digits', () => {
    expect(convert('XMLHttpRequest', 'snake')).toBe('xml_http_request');
    expect(convert('XMLHttpRequest', 'camel')).toBe('xmlHttpRequest');
    expect(convert('api v2 url', 'pascal')).toBe('ApiV2Url');
    expect(convert('api v2 url', 'constant')).toBe('API_V_2_URL');
  });

  it('keeps accents', () => {
    expect(convert('crème brûlée', 'pascal')).toBe('CrèmeBrûlée');
    expect(convert('CrèmeBrûlée', 'kebab')).toBe('crème-brûlée');
  });
});
