import { decode, encode, type Document, type Element } from '../xml/logic';

/**
 * XML to JSON and back, by one convention (the one most libraries use):
 *
 *   <a x="1">text</a>     ⇄  { "a": { "@x": "1", "#text": "text" } }      attributes get an @, text is #text
 *   <a>text</a>           ⇄  { "a": "text" }                               only text: just the string
 *   <a/>                  ⇄  { "a": null }
 *   <a><b/><b/></a>       ⇄  { "a": { "b": [null, null] } }                the same name twice: an array
 *
 * JSON can not hold everything XML can: comments and instructions are dropped, and when text and elements are mixed
 * (<p>a <b>b</b> c</p>) the pieces of text are joined and their place between the elements is lost.
 */

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export interface ToJsonOptions {
  /** Write values that look like a number, true or false as that type instead of as a string */
  types?: boolean;
}

function typed(text: string, types: boolean): Json {
  if (!types) return text;
  if (text === 'true') return true;
  if (text === 'false') return false;
  // only what JSON itself would write as a number: "007" and "1e3x" stay text
  return /^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$/.test(text) && Number.isFinite(Number(text)) ? Number(text) : text;
}

function elementToJson(element: Element, types: boolean): Json {
  const out: { [key: string]: Json } = {};
  for (const attribute of element.attributes) out[`@${attribute.name}`] = typed(decode(attribute.value), types);

  let text = '';
  let children = 0;
  for (const child of element.children) {
    if (child.type === 'text') text += decode(child.value);
    else if (child.type === 'cdata') text += child.value;
    else if (child.type === 'element') {
      children++;
      const value = elementToJson(child, types);
      const existing = out[child.name];
      if (existing === undefined) out[child.name] = value;
      else if (Array.isArray(existing)) existing.push(value);
      else out[child.name] = [existing, value];
    }
  }
  // whitespace around text is layout once there are elements next to it; on its own it may be the value
  const value = children ? text.trim() : text;
  const plain = value.trim();
  if (!element.attributes.length && !children) return plain === '' ? null : typed(plain, types);
  if (plain !== '') out['#text'] = typed(children ? value : plain, types);
  return out;
}

/** An XML document as a JSON value: an object with the root element as its only key. */
export const xmlToJson = (document: Document, { types = false }: ToJsonOptions = {}): Json => ({
  [document.root.name]: elementToJson(document.root, types)
});

/** A name XML accepts: other characters become _, and a name can not start with a digit, a dash or a dot. */
export function xmlName(key: string): string {
  const name = key.replace(/[^\p{L}\p{N}_.:-]/gu, '_');
  return name === '' || /^[0-9.-]/.test(name) ? `_${name}` : name;
}

export interface ToXmlOptions {
  /** What one level is indented with; null puts everything on one line */
  indent?: string | null;
  /** Start with <?xml version="1.0" encoding="UTF-8"?> */
  declaration?: boolean;
  /** The element to wrap the value in when it does not have exactly one root of its own */
  rootName?: string;
}

const isObject = (value: Json): value is { [key: string]: Json } => typeof value === 'object' && value !== null && !Array.isArray(value);

function toElements(name: string, value: Json, indent: string | null, depth: number): string[] {
  // an array is the same element several times
  if (Array.isArray(value)) return value.flatMap((item) => toElements(name, Array.isArray(item) ? { item } : item, indent, depth));
  const pad = indent === null ? '' : indent.repeat(depth);
  const tag = xmlName(name);
  if (value === null) return [`${pad}<${tag}/>`];
  if (!isObject(value)) return [`${pad}<${tag}>${encode(String(value))}</${tag}>`];

  const attributes = Object.entries(value)
    .filter(([key, v]) => key.startsWith('@') && key.length > 1 && !isObject(v) && !Array.isArray(v))
    .map(([key, v]) => ` ${xmlName(key.slice(1))}="${encode(v === null ? '' : String(v), '"')}"`)
    .join('');
  const text = value['#text'];
  const children = Object.entries(value)
    .filter(([key, v]) => key !== '#text' && !(key.startsWith('@') && key.length > 1 && !isObject(v) && !Array.isArray(v)))
    .flatMap(([key, v]) => toElements(key.replace(/^@/, ''), v, indent, depth + 1));
  const content = text === undefined || text === null ? '' : encode(isObject(text) || Array.isArray(text) ? JSON.stringify(text) : String(text));

  if (!children.length) return [content ? `${pad}<${tag}${attributes}>${content}</${tag}>` : `${pad}<${tag}${attributes}/>`];
  const inner = indent === null ? '' : indent.repeat(depth + 1);
  return [`${pad}<${tag}${attributes}>`, ...(content ? [`${inner}${content}`] : []), ...children, `${pad}</${tag}>`];
}

/**
 * A JSON value as an XML document. An object with one key becomes that root element; anything else (several keys,
 * an array, a single value) is wrapped in a root of its own, because XML needs exactly one.
 */
export function jsonToXml(value: Json, { indent = '  ', declaration = true, rootName = 'root' }: ToXmlOptions = {}): string {
  const keys = isObject(value) ? Object.keys(value) : [];
  const single = keys.length === 1 && !keys[0].startsWith('@') && keys[0] !== '#text' && !Array.isArray((value as { [key: string]: Json })[keys[0]]);
  const lines = single
    ? toElements(keys[0], (value as { [key: string]: Json })[keys[0]], indent, 0)
    : toElements(rootName, Array.isArray(value) ? { item: value } : value, indent, 0);
  const head = declaration ? ['<?xml version="1.0" encoding="UTF-8"?>'] : [];
  return [...head, ...lines].join(indent === null ? '' : '\n');
}
