import * as fs from "fs";
import * as path from "path";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Schema = any;

export interface SchemaDefinition {
  uri: string;
  schema: Schema;
}

// find the XML files recursively
export function findXmlFiles(dirOrFile: string): string[] {
  const absolutePath = path.resolve(dirOrFile);
  const stats = fs.statSync(absolutePath);

  if (stats.isFile()) return [absolutePath];

  const files: string[] = [];
  const entries = fs.readdirSync(absolutePath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(absolutePath, entry.name);
    if (entry.isDirectory()) {
      files.push(...findXmlFiles(fullPath));
    } else if (entry.isFile() && fullPath.endsWith(".xml")) {
      files.push(fullPath);
    }
  }
  return files;
}

// map some special names to Git branches
const ALIASES: Record<string, string> = {
  latest:
    "https://raw.githubusercontent.com/agama-project/agama/refs/heads/master/rust/share/profile.schema.json",
  "SLE-16.0":
    "https://raw.githubusercontent.com/agama-project/agama/refs/heads/SLE-16/rust/agama-lib/share/profile.schema.json"
};

export async function loadSchema(schemaRef: string): Promise<SchemaDefinition[]> {
  // explicit URL
  if (schemaRef.startsWith("http://") || schemaRef.startsWith("https://")) {
    return await fetchSchema(schemaRef);
  }
  // local file
  else if (fs.existsSync(path.resolve(schemaRef))) {
    return await loadLocalSchema(schemaRef);
  }
  // Git branch name
  else {
    const url =
      ALIASES[schemaRef] ||
      `https://raw.githubusercontent.com/agama-project/agama/refs/heads/${schemaRef}/rust/share/profile.schema.json`;
    return await fetchSchema(url);
  }
}

async function loadLocalSchema(filePath: string): Promise<SchemaDefinition[]> {
  const absolutePath = path.resolve(filePath);
  const content = fs.readFileSync(absolutePath, "utf-8");
  const json = JSON.parse(content);
  delete json.$schema;

  const result: SchemaDefinition[] = [
    {
      uri: absolutePath,
      schema: json
    }
  ];

  async function findReferences(data: Schema) {
    if (data && typeof data === "object") {
      for (const [key, value] of Object.entries(data)) {
        // ignore relative references, process only JSON references
        if (
          key === "$ref" &&
          typeof value === "string" &&
          !value.startsWith("#") &&
          value.endsWith(".json")
        ) {
          const dir = path.dirname(absolutePath);
          const referencedPath = path.resolve(dir, value);

          const nestedData = await loadLocalSchema(referencedPath);
          result.push(...nestedData);
        }
        await findReferences(value);
      }
    }
  }

  await findReferences(json);
  return result;
}

async function fetchSchema(url: string): Promise<SchemaDefinition[]> {
  console.log(`Downloading ${url}...`);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch schema ${url}: ${response.statusText}`);

  const json = await response.json();
  delete json.$schema;

  const result: SchemaDefinition[] = [
    {
      uri: url,
      schema: json
    }
  ];

  async function findReferences(data: Schema) {
    if (data && typeof data === "object") {
      for (const [key, value] of Object.entries(data)) {
        // ignore relative references, process only JSON references
        if (
          key === "$ref" &&
          typeof value === "string" &&
          !value.startsWith("#") &&
          value.endsWith(".json")
        ) {
          // replace the base filename in the URL path
          const schemaUrl = new URL(url);
          const pathParts = schemaUrl.pathname.split("/");
          pathParts[pathParts.length - 1] = value;
          schemaUrl.pathname = pathParts.join("/");

          const nestedData = await fetchSchema(schemaUrl.toString());

          result.push(...nestedData);
        }
        await findReferences(value);
      }
    }
  }

  await findReferences(json);

  return result;
}
