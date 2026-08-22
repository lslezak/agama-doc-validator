import pc from "picocolors";
import { findXmlFiles, loadSchema } from "./utils.js";
import { extractScreenSnippets } from "./parser.js";
import { analyzeSnippet } from "./heuristics.js";
import { Validator } from "./validator.js";

export async function runValidator(
  input: string,
  schemaRef: string,
  verbose: boolean,
  all: boolean = false
) {
  if (verbose) {
    console.log(pc.gray("Validation options:"));
    console.log(pc.gray(`  Verbose: ${verbose}`));
    console.log(pc.gray(`  Path:    ${input}`));
    console.log(pc.gray(`  Schema:  ${schemaRef}`));
    console.log(pc.gray(`  All:     ${all}\n`));
  }

  const xmlFiles = findXmlFiles(input);

  if (xmlFiles.length === 0) {
    console.log(pc.red("❌ No XML file found."));
    process.exit(1);
  }

  console.log(pc.cyan(`Loading schema "${schemaRef}"...`));
  const schema = await loadSchema(schemaRef);
  const validator = new Validator(schema);

  console.log(pc.cyan(`Found XML files: ${xmlFiles.length}\n`));

  let totalScreens = 0;
  let totalJsons = 0;
  const errors: string[] = [];

  for (const file of xmlFiles) {
    if (verbose) console.log(pc.gray(`Processing ${file}...`));
    const snippets = extractScreenSnippets(file, all);
    totalScreens += snippets.length;

    for (const snippet of snippets) {
      if (verbose) console.log(pc.gray(`  Found <screen> tag at line ${snippet.line}`));
      const result = analyzeSnippet(snippet.text, !all);

      if (result.isJson) {
        totalJsons++;
        if (result.error) {
          if (verbose) console.log(pc.red(`    -> Malformed JSON`));
          errors.push(
            `MALFORMED JSON\n   File: ${snippet.file}\n   Line: ${snippet.line}\n   Details: ${result.error}`
          );
        } else {
          const validationErrors = validator.validate(result.parsed);
          if (validationErrors.length > 0) {
            if (verbose) console.log(pc.red(`    -> Schema Violation`));
            errors.push(
              `SCHEMA VIOLATION\n   File: ${snippet.file}\n   Line: ${snippet.line}\n   Details: ${validationErrors.join("; ")}`
            );
          } else if (verbose) {
            console.log(pc.green(`    -> Valid JSON & Compliant`));
          }
        }
      } else if (verbose) {
        console.log(pc.gray(`    -> Not JSON (Ignored)`));
      }
    }
  }

  if (all) {
    console.log(`🔍 Found ${totalScreens} <screen> tags.`);
  }

  console.log(`🧩 Identified ${totalJsons} Agama JSON profiles.\n`);

  if (errors.length > 0) {
    console.log(pc.red(`❌ ${errors.length} Errors Found:\n`));
    errors.forEach((err, idx) => console.log(`${idx + 1}) ${err}\n`));
    process.exit(1);
  } else {
    if (totalJsons === 0) {
      console.log(pc.yellowBright("ℹ️  No Agama JSON profiles found."));
    } else {
      console.log(
        pc.green("✅ Validation complete, all JSON profiles are well-formed and schema-compliant.")
      );
    }
  }
}
