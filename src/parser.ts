import * as fs from "fs";
import * as sax from "sax";
import pc from "picocolors";

export interface ScreenSnippet {
  file: string;
  line: number;
  text: string;
}

export function extractScreenSnippets(filePath: string, all: boolean = false): ScreenSnippet[] {
  const snippets: ScreenSnippet[] = [];
  const content = fs.readFileSync(filePath, "utf-8");

  // Using non-strict mode to avoid crashing on DocBook custom entities (e.g. &prompt.sudo;)
  const parser = sax.parser(false, { lowercase: true });
  let inScreen = false;
  let currentText = "";
  let startLine = 0;

  parser.onopentag = (node) => {
    if (node.name === "screen") {
      const isAgamaJson = (node.attributes as any)?.language === "agama-json";
      if (all || isAgamaJson) {
        inScreen = true;
        currentText = "";
        startLine = parser.line;
      }
    }
  };

  parser.ontext = (text) => {
    if (inScreen) {
      // TODO: what about the XML entities, replace them?
      // currentText += text.replace(/&[a-zA-Z0-9_.-]+;/g, '"__ENTITY__"');
      currentText += text;
    }
  };

  parser.onclosetag = (name) => {
    if (name === "screen" && inScreen) {
      inScreen = false;

      snippets.push({
        file: filePath,
        line: startLine + 1, // sax parser lines are 0-indexed
        text: currentText
      });
    }
  };

  try {
    parser.write(content).close();
  } catch (error: any) {
    // Continue if the parser crashes to check all files
    console.log(pc.yellowBright(`WARNING: parsing ${filePath} failed: ${error?.message}`));
  }

  return snippets;
}
