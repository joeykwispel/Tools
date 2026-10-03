/** File permissions on Unix: the number chmod takes (755), the letters ls shows (rwxr-xr-x), and the twelve bits behind both. */

export const WHO = ['owner', 'group', 'other'] as const;
export const WHAT = ['read', 'write', 'execute'] as const;
export const SPECIAL = ['setuid', 'setgid', 'sticky'] as const;

/** The bit for one permission of one kind of user: owner read is 0o400, other execute is 0o001. */
export const bit = (who: number, what: number) => 1 << ((2 - who) * 3 + (2 - what));
/** The bit of a special permission: setuid 0o4000, setgid 0o2000, sticky 0o1000. */
export const specialBit = (which: number) => 0o4000 >> which;

/** Reads 755, 0755 or 4755, or the letters as ls writes them: rwxr-xr-x, with or without the file type in front. */
export function parseMode(text: string): number | null {
  const value = text.trim();
  if (/^[0-7]{3,4}$/.test(value)) return parseInt(value, 8);
  const letters = /^[-dlbcps]?([r-][w-][xsS-])([r-][w-][xsS-])([r-][w-][xtT-])$/.exec(value);
  if (!letters) return null;
  let mode = 0;
  letters.slice(1).forEach((triad, who) => {
    if (triad[0] === 'r') mode |= bit(who, 0);
    if (triad[1] === 'w') mode |= bit(who, 1);
    // a lowercase s or t is the special bit with execute; in capitals it is the special bit without
    if (/[xst]/.test(triad[2])) mode |= bit(who, 2);
    if (/[sStT]/.test(triad[2])) mode |= specialBit(who);
  });
  return mode;
}

/** The number for chmod: three digits, or four when a special bit is set. */
export const octal = (mode: number) => mode.toString(8).padStart(mode > 0o777 ? 4 : 3, '0');

/** The nine letters of ls -l, without the file type. */
export function symbolic(mode: number): string {
  return WHO.map((_, who) => {
    const execute = !!(mode & bit(who, 2));
    const special = !!(mode & specialBit(who));
    const letter = who === 2 ? 't' : 's';
    const last = special ? (execute ? letter : letter.toUpperCase()) : execute ? 'x' : '-';
    return (mode & bit(who, 0) ? 'r' : '-') + (mode & bit(who, 1) ? 'w' : '-') + last;
  }).join('');
}
