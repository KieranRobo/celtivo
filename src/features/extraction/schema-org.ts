// Many airline, hotel and ticketing emails embed schema.org JSON-LD (what Gmail uses for
// trip cards). Reading it is free and exact. Mail apps often strip <script> tags when a
// message is forwarded by hand, so this mostly helps with auto-forwarded mail.

export type SchemaOrgNode = Record<string, unknown>;

const JSON_LD =
  /<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;

/** Every JSON-LD object in the HTML, with arrays and @graph flattened. */
export function findSchemaOrgNodes(html: string): SchemaOrgNode[] {
  const nodes: SchemaOrgNode[] = [];
  for (const [, body] of html.matchAll(JSON_LD)) {
    try {
      collect(JSON.parse(decodeEntities(body)), nodes);
    } catch {
      // Malformed markup: ignore it and let the AI path read the email.
    }
  }
  return nodes;
}

/** Whether a node's @type is `type` (or a list including it), with or without a prefix. */
export function hasType(node: SchemaOrgNode, type: string): boolean {
  const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
  return types.some((value) => typeof value === "string" && value.replace(/^.*[/:]/, "") === type);
}

/** A nested object property, or undefined. */
export function child(node: SchemaOrgNode | undefined, key: string): SchemaOrgNode | undefined {
  const value = node?.[key];
  const first = Array.isArray(value) ? value[0] : value;
  return first && typeof first === "object" ? (first as SchemaOrgNode) : undefined;
}

/** A string property, or undefined. */
export function text(node: SchemaOrgNode | undefined, key: string): string | undefined {
  const value = node?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function collect(value: unknown, into: SchemaOrgNode[]) {
  if (Array.isArray(value)) {
    value.forEach((item) => collect(item, into));
  } else if (value && typeof value === "object") {
    const node = value as SchemaOrgNode;
    if (Array.isArray(node["@graph"])) collect(node["@graph"], into);
    else into.push(node);
  }
}

function decodeEntities(body: string): string {
  // Some senders HTML-escape the JSON inside the script tag.
  return body.includes("&quot;") ? body.replace(/&quot;/g, '"').replace(/&amp;/g, "&") : body;
}
