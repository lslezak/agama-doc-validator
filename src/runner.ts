import pc from "picocolors";
import { findXmlFiles, loadSchema } from "./utils.js";
import { extractScreenSnippets } from "./parser.js";
import { analyzeSnippet } from "./heuristics.js";
import { Validator } from "./validator.js";

function formatSnippetText(text: string): string {
  return text
    .split("\n")
    .map((line) => `   ${line}`)
    .join("\n");
}

export async function runValidator(
  input: string,
  schemaRef: string,
  verbose: boolean,
  all: boolean = false,
  missing: boolean = false
) {
  if (verbose) {
    console.log(pc.gray("Validation options:"));
    console.log(pc.gray(`  Verbose: ${verbose}`));
    console.log(pc.gray(`  Path:    ${input}`));
    console.log(pc.gray(`  Schema:  ${schemaRef}`));
    console.log(pc.gray(`  All:     ${all}`));
    console.log(pc.gray(`  Missing: ${missing}\n`));
  }

  const xmlFiles = findXmlFiles(input);

  if (xmlFiles.length === 0) {
    console.log(pc.red("❌ No XML file found."));
    process.exit(1);
  }

  console.log(pc.cyan(`Loading schema "${schemaRef}"...`));
  const schema = await loadSchema(schemaRef);
  const validator = new Validator(schema);

  console.log(pc.cyan(`\nFound XML files: ${xmlFiles.length}`));

  let totalScreens = 0;
  let totalJsons = 0;
  let totalMissing = 0;
  const errors: string[] = [];

  for (const file of xmlFiles) {
    console.log(pc.gray(`Processing ${file}...`));
    const snippets = extractScreenSnippets(file, all || missing);
    totalScreens += snippets.length;

    for (const snippet of snippets) {
      if (verbose) console.log(pc.gray(`  Found <screen> tag at line ${snippet.line}`));

      if (missing && snippet.language === "agama-json") {
        if (verbose) console.log(pc.gray(`    -> Already has language="agama-json" (Ignored)`));
        continue;
      }

      const result = analyzeSnippet(snippet.text, !all && !missing);

      if (result.isJson) {
        if (result.error) {
          if (!missing) {
            totalJsons++;
            if (verbose) console.log(pc.red(`    -> Malformed JSON`));
            errors.push(
              `MALFORMED JSON\n   File: ${snippet.file}\n   Line: ${snippet.line}\n   Details: ${result.error}\n   Text:\n${pc.gray(formatSnippetText(snippet.text))}`
            );
          }
        } else {
          const validationErrors = validator.validate(result.parsed);
          if (validationErrors.length > 0) {
            if (missing) {
              if (verbose) console.log(pc.gray(`    -> JSON but violates schema (Ignored)`));
            } else {
              totalJsons++;
              if (verbose) console.log(pc.red(`    -> Schema Violation`));
              errors.push(
                `SCHEMA VIOLATION\n   File: ${snippet.file}\n   Line: ${snippet.line}\n   Details: ${validationErrors.join("; ")}\n   Text:\n${pc.gray(formatSnippetText(snippet.text))}`
              );
            }
          } else if (verbose) {
            if (missing) {
              console.log(pc.red(`    -> Found valid JSON profile missing language attribute!`));
            } else {
              console.log(pc.green(`    -> Valid JSON & Compliant`));
            }
          }

          if (validationErrors.length === 0) {
            if (missing) {
              totalMissing++;
              errors.push(
                `MISSING LANGUAGE ATTRIBUTE\n   File: ${snippet.file}\n   Line: ${snippet.line}\n   Details: <screen> tag contains a valid Agama JSON profile but is missing language="agama-json"`
              );
            } else {
              totalJsons++;
            }
          }
        }
      } else if (verbose) {
        console.log(pc.gray(`    -> Not JSON (Ignored)`));
      }
    }
  }

  console.log();
  if (all || missing) {
    console.log(`🔍 Found ${totalScreens} <screen> tags.`);
  }

  if (missing) {
    console.log(
      `🧩 Identified ${totalMissing} valid Agama JSON profiles missing language attribute.`
    );
  } else {
    console.log(`🧩 Identified ${totalJsons} Agama JSON profiles.`);
  }

  if (errors.length > 0) {
    console.log(pc.red(`❌ ${errors.length} Errors Found:\n`));
    errors.forEach((err, idx) => console.log(`${idx + 1}) ${err}\n`));

    if (missing) {
      console.log(
        pc.cyan(
          "ℹ️  Add the 'language=\"agama-json\"' attribute to the <screen> tags so they are properly recognized."
        )
      );
      console.log(
        pc.cyan(
          "   If the content accidentally matches the Agama JSON schema and but it is a different content then use some other language, e.g. 'language=\"json\"'."
        )
      );
    }

    process.exit(1);
  } else {
    if (missing) {
      console.log(
        pc.green(
          "✅ Validation complete. No valid JSON profiles are missing the language attribute."
        )
      );
    } else if (totalJsons === 0) {
      console.log(pc.yellowBright("ℹ️  No Agama JSON profiles found."));
    } else {
      console.log(
        pc.green("✅ Validation complete, all JSON profiles are well-formed and schema-compliant.")
      );
    }
  }
}
