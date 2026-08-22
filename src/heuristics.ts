export interface HeuristicsResult {
  isJson: boolean;
  parsed?: any;
  error?: string;
}

export function analyzeSnippet(text: string, forceJson: boolean = false): HeuristicsResult {
  // remove the "..." placeholders
  let trimmed = text.trim().replaceAll("...", "");
  if (!trimmed) {
    if (forceJson) {
      return { isJson: true, error: "Unexpected end of JSON input" };
    }
    return { isJson: false };
  }

  if (!forceJson) {
    // some text snippets which indicate not a JSON content
    const exclude = [
      // ignition configuration
      '"ignition"',
      // shell command
      "&prompt",
      // XML snippet
      "</"
    ];

    // skip if the input contains any of the "exclude" texts
    if (exclude.some((ex) => trimmed.includes(ex))) {
      return { isJson: false };
    }

    // skip if any input line matches the ini section regexp
    const regexp = /^\[\s*([a-zA-Z0-9:_ ]+)\s*\]/;
    if (trimmed.split("\n").some((line) => regexp.test(line))) {
      return { isJson: false };
    }
  }

  const firstChar = trimmed[0];

  // Check for JSON fragment heuristic (e.g., "key": "value" or 'key': { ... })
  if (firstChar === '"' || firstChar === "'") {
    if (trimmed.includes(":")) {
      // Wrap in {} to form a valid JSON object
      trimmed = `{ ${trimmed} }`;
    } else if (!forceJson) {
      return { isJson: false };
    }
  }
  // Standard JSON signature check
  else if (firstChar !== "{" && firstChar !== "[") {
    if (!forceJson) {
      return { isJson: false };
    }
  }

  try {
    const parsed = JSON.parse(trimmed);
    return { isJson: true, parsed };
  } catch (err: any) {
    return { isJson: true, error: err.message };
  }
}
