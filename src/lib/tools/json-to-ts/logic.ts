/** From an example of JSON to TypeScript interfaces and a Zod schema: what shape does this data have? */

export type Shape =
  | { kind: 'primitive'; name: 'string' | 'number' | 'boolean' | 'null' }
  | { kind: 'array'; item: Shape }
  | { kind: 'object'; fields: Map<string, Field> }
  | { kind: 'union'; options: Shape[] }
  /** nothing is known: the items of an empty array */
  | { kind: 'unknown' };

export interface Field {
  shape: Shape;
  /** Missing in at least one of the objects this shape was made from */
  optional: boolean;
}

const UNKNOWN: Shape = { kind: 'unknown' };

/** A text that is the same for two shapes exactly when they are the same shape. */
function key(shape: Shape): string {
  switch (shape.kind) {
    case 'primitive':
      return shape.name;
    case 'unknown':
      return '?';
    case 'array':
      return `[${key(shape.item)}]`;
    case 'union':
      return shape.options.map(key).sort().join('|');
    case 'object':
      return `{${[...shape.fields]
        .map(([name, f]) => `${JSON.stringify(name)}${f.optional ? '?' : ''}:${key(f.shape)}`)
        .sort()
        .join(',')}}`;
  }
}

/** One shape that fits both: what an array holding an `a` and a `b` holds. */
export function merge(a: Shape, b: Shape): Shape {
  if (a.kind === 'unknown') return b;
  if (b.kind === 'unknown') return a;
  if (a.kind === 'object' && b.kind === 'object') {
    const fields = new Map<string, Field>();
    for (const name of new Set([...a.fields.keys(), ...b.fields.keys()])) {
      const x = a.fields.get(name);
      const y = b.fields.get(name);
      // a field that one of them lacks is optional
      fields.set(name, x && y ? { shape: merge(x.shape, y.shape), optional: x.optional || y.optional } : { shape: (x ?? y)!.shape, optional: true });
    }
    return { kind: 'object', fields };
  }
  if (a.kind === 'array' && b.kind === 'array') return { kind: 'array', item: merge(a.item, b.item) };
  // different kinds: a union, flat and without doubles; objects and arrays inside it are merged with their own kind
  const options: Shape[] = [];
  for (const option of [...(a.kind === 'union' ? a.options : [a]), ...(b.kind === 'union' ? b.options : [b])]) {
    const same = options.findIndex((o) => o.kind === option.kind && (o.kind === 'object' || o.kind === 'array' || key(o) === key(option)));
    if (same === -1) options.push(option);
    else options[same] = options[same].kind === 'primitive' ? options[same] : merge(options[same], option);
  }
  return options.length === 1 ? options[0] : { kind: 'union', options };
}

/** The shape of a value as JSON.parse gives it. */
export function infer(value: unknown): Shape {
  if (value === null) return { kind: 'primitive', name: 'null' };
  if (Array.isArray(value)) return { kind: 'array', item: value.map(infer).reduce(merge, UNKNOWN) };
  if (typeof value === 'object')
    return { kind: 'object', fields: new Map(Object.entries(value).map(([name, v]) => [name, { shape: infer(v), optional: false }])) };
  return { kind: 'primitive', name: typeof value as 'string' | 'number' | 'boolean' };
}

const words = (text: string) => text.match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|[0-9]+/g) ?? [];
const capital = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

/** "user_profiles" → "UserProfiles". Always a valid identifier. */
export function pascal(text: string): string {
  const name = words(text).map(capital).join('');
  return !name ? 'Item' : /^[0-9]/.test(name) ? `_${name}` : name;
}

/** The name for one item of a list: "users" → "user", "categories" → "category". Good enough for names, not for grammar. */
export function singular(text: string): string {
  if (/ies$/i.test(text)) return text.slice(0, -3) + 'y';
  if (/(ss|us|is)$/i.test(text)) return text;
  return /s$/i.test(text) && text.length > 1 ? text.slice(0, -1) : text;
}

const lowerFirst = (name: string) => name.charAt(0).toLowerCase() + name.slice(1);
const property = (name: string) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name));

interface Declaration {
  name: string;
  shape: Extract<Shape, { kind: 'object' }>;
}

/** Gives every object shape a name: the same shape gets the same name, different shapes never share one. */
function declarations(root: Shape, rootName: string): { list: Declaration[]; nameOf: (shape: Shape) => string } {
  const byKey = new Map<string, string>();
  const used = new Set<string>();
  const list: Declaration[] = [];

  // a root that is not an object is declared as a type of that name: nothing else may take it
  if (root.kind !== 'object') used.add(pascal(rootName));

  const visit = (shape: Shape, hint: string): void => {
    if (shape.kind === 'array') {
      // "Row = Row[]" can't be: when the singular is the list's own name, the items are "RowItem"
      const one = singular(hint);
      return visit(shape.item, used.has(pascal(one)) && pascal(one) === pascal(hint) ? `${hint} item` : one);
    }
    if (shape.kind === 'union') return shape.options.forEach((option) => visit(option, hint));
    if (shape.kind !== 'object' || byKey.has(key(shape))) return;
    let name = pascal(hint);
    for (let n = 2; used.has(name); n++) name = `${pascal(hint)}${n}`;
    used.add(name);
    byKey.set(key(shape), name);
    // the parts before the whole: a Zod schema can only use what is declared above it
    for (const [field, { shape: inner }] of shape.fields) visit(inner, field);
    list.push({ name, shape });
  };
  visit(root, rootName);
  return { list, nameOf: (shape) => byKey.get(key(shape))! };
}

/** TypeScript interfaces for `shape`, the root first. */
export function toTypeScript(shape: Shape, rootName = 'Root'): string {
  const { list, nameOf } = declarations(shape, rootName);
  const type = (s: Shape): string => {
    switch (s.kind) {
      case 'primitive':
        return s.name;
      case 'unknown':
        return 'unknown';
      case 'object':
        return nameOf(s);
      case 'array':
        return s.item.kind === 'union' ? `(${type(s.item)})[]` : `${type(s.item)}[]`;
      case 'union':
        return s.options.map(type).join(' | ');
    }
  };
  const interfaces = [...list]
    .reverse()
    .map(
      ({ name, shape: object }) =>
        `export interface ${name} {\n${[...object.fields].map(([field, f]) => `  ${property(field)}${f.optional ? '?' : ''}: ${type(f.shape)};\n`).join('')}}`
    );
  // a root that is not an object still needs a name to be used by
  if (shape.kind !== 'object') interfaces.unshift(`export type ${pascal(rootName)} = ${type(shape)};`);
  return interfaces.join('\n\n') + '\n';
}

/** A Zod schema for `shape`, with the inferred type exported next to it. */
export function toZod(shape: Shape, rootName = 'Root'): string {
  const { list, nameOf } = declarations(shape, rootName);
  const schemaName = (name: string) => `${lowerFirst(name)}Schema`;
  const schema = (s: Shape): string => {
    switch (s.kind) {
      case 'primitive':
        return `z.${s.name}()`;
      case 'unknown':
        return 'z.unknown()';
      case 'object':
        return schemaName(nameOf(s));
      case 'array':
        return `z.array(${schema(s.item)})`;
      case 'union': {
        const rest = s.options.filter((o) => key(o) !== 'null');
        // "something or null" reads better as .nullable()
        if (rest.length === 1 && s.options.length === 2) return `${schema(rest[0])}.nullable()`;
        return `z.union([${s.options.map(schema).join(', ')}])`;
      }
    }
  };
  const root = pascal(rootName);
  const consts = list.map(
    ({ name, shape: object }) =>
      `${name === root ? 'export ' : ''}const ${schemaName(name)} = z.object({\n${[...object.fields]
        .map(([field, f]) => `  ${property(field)}: ${schema(f.shape)}${f.optional ? '.optional()' : ''},\n`)
        .join('')}});`
  );
  if (shape.kind !== 'object') consts.push(`export const ${schemaName(root)} = ${schema(shape)};`);
  return `import { z } from 'zod';\n\n${consts.join('\n\n')}\n\nexport type ${root} = z.infer<typeof ${schemaName(root)}>;\n`;
}
