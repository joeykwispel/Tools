/** An IPv4 network in CIDR notation (192.168.1.10/24): its mask, its first and last address, and how many hosts fit. */

export type Kind = 'private' | 'loopback' | 'linkLocal' | 'shared' | 'multicast' | 'reserved' | 'public';

export type Cidr =
  | {
      ok: true;
      address: string;
      prefix: number;
      mask: string;
      /** The mask the other way around, as access lists want it */
      wildcard: string;
      network: string;
      broadcast: string;
      /** The first and last address a host can have */
      first: string;
      last: string;
      /** Addresses a host can have */
      hosts: number;
      /** All addresses in the network */
      total: number;
      kind: Kind;
      /** The mask in bits, per byte */
      binary: string;
    }
  | { ok: false; error: 'empty' | 'address' | 'prefix' };

/** An address as one number, or null when it is not four numbers from 0 to 255. */
export function toNumber(address: string): number | null {
  const parts = address.split('.');
  if (parts.length !== 4 || !parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)) return null;
  return parts.reduce((sum, part) => sum * 256 + Number(part), 0);
}

export const toAddress = (value: number) => [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join('.');

const RANGES: [string, number, Kind][] = [
  ['10.0.0.0', 8, 'private'],
  ['172.16.0.0', 12, 'private'],
  ['192.168.0.0', 16, 'private'],
  ['127.0.0.0', 8, 'loopback'],
  ['169.254.0.0', 16, 'linkLocal'],
  ['100.64.0.0', 10, 'shared'],
  ['224.0.0.0', 4, 'multicast'],
  ['240.0.0.0', 4, 'reserved'],
  ['0.0.0.0', 8, 'reserved']
];

const maskOf = (prefix: number) => (prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0);

/** Reads 192.168.1.10/24. Without a prefix it is one address: /32. */
export function parse(text: string): Cidr {
  const value = text.trim();
  if (!value) return { ok: false, error: 'empty' };
  const [address, length, ...more] = value.split('/');
  const number = toNumber(address.trim());
  if (number === null || more.length) return { ok: false, error: 'address' };
  if (length !== undefined && !/^\s*\d{1,2}\s*$/.test(length)) return { ok: false, error: 'prefix' };
  const prefix = length === undefined ? 32 : Number(length);
  if (prefix > 32) return { ok: false, error: 'prefix' };

  const mask = maskOf(prefix);
  const network = (number & mask) >>> 0;
  const broadcast = (network | ~mask) >>> 0;
  const total = 2 ** (32 - prefix);
  // a /31 is a link between two routers, where both addresses are used; a /32 is one host
  const small = prefix >= 31;
  const kind = RANGES.find(([start, bits]) => (number & maskOf(bits)) >>> 0 === toNumber(start))?.[2] ?? 'public';
  return {
    ok: true,
    address: toAddress(number),
    prefix,
    mask: toAddress(mask),
    wildcard: toAddress(~mask >>> 0),
    network: toAddress(network),
    broadcast: toAddress(broadcast),
    first: toAddress(small ? network : network + 1),
    last: toAddress(small ? broadcast : broadcast - 1),
    hosts: small ? total : total - 2,
    total,
    kind,
    binary: [24, 16, 8, 0].map((shift) => ((mask >>> shift) & 255).toString(2).padStart(8, '0')).join('.')
  };
}
