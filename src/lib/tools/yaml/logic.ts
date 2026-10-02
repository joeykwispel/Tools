import { parseAllDocuments, stringify } from 'yaml';
import { parse as parseJson, toValue } from '../json/logic';

/** YAML to JSON and back. YAML is read by the `yaml` library (YAML 1.2); JSON by this site's own parser, for its error places. */

export type Converted =
  | { ok: true; text: string; /** How many YAML documents the input held (they become one JSON array when more than one) */ documents: number }
  | {
      ok: false;
      /** From 1; 0 when the place is not known */ line: number;
      column: number;
      message: string;
      /** One of the JSON tool's error kinds, for JSON input */ kind?: string;
    };

/** YAML to JSON. A file with several documents (separated by ---) becomes an array of them. */
export function yamlToJson(text: string, indent = 2): Converted {
  const documents = parseAllDocuments(text);
  // an empty input parses as "no documents": that is null, as YAML defines it
  if (!Array.isArray(documents) || documents.length === 0) return { ok: true, text: 'null', documents: 0 };
  for (const document of documents) {
    const error = document.errors[0];
    if (error) {
      const place = error.linePos?.[0];
      // the library puts "at line 1, column 2" and a picture of the line behind its message; the place is shown separately
      return { ok: false, line: place?.line ?? 0, column: place?.col ?? 0, message: error.message.split(/ at line \d+/)[0].split('\n')[0] };
    }
  }
  const values: unknown[] = documents.map((document) => document.toJS());
  return { ok: true, text: JSON.stringify(values.length === 1 ? values[0] : values, null, indent) ?? 'null', documents: values.length };
}

/** JSON to YAML. */
export function jsonToYaml(text: string, indent = 2): Converted {
  const parsed = parseJson(text);
  if (!parsed.ok) return { ok: false, line: parsed.error.line, column: parsed.error.column, message: parsed.error.found, kind: parsed.error.kind };
  // lineWidth 0: never fold a long string over several lines, so a value stays recognisable
  return { ok: true, text: stringify(toValue(parsed.node), { indent, lineWidth: 0 }), documents: 1 };
}
