# Agama Doc Validator

The **Agama Doc Validator** is a CLI tool designed to scan DocBook XML files, automatically identify JSON snippets within `<screen>` tags, and validate them against an Agama Profile JSON Schema.

This tool is particularly useful for ensuring that documentation examples containing Agama profiles are syntactically correct and adhere to the latest schema definitions.

## Features

- **Fast SAX Parsing**: Safely extracts `<screen>` content from DocBook XML files without crashing on unexpanded entities.
- **Smart Heuristics Engine**: Automatically detects if a snippet inside a `<screen>` tag is a JSON object or array. It even handles partial JSON fragments.
- **Schema Validation**: Validates the extracted JSON against a provided JSON Schema (supports local files, URLs, or predefined aliases).
- **Clear Reporting**: Outputs detailed file names, line numbers, and exact validation errors.

## Prerequisites

- Node.js (v22 or higher recommended)
- `npm` (comes with Node.js)

## Installation & Build

1. Navigate to the tool directory:
   ```bash
   cd agama-doc-validator
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project (compiles TypeScript to JavaScript):
   ```bash
   npm run build
   ```

## Usage

You can run the tool directly using `npm start` (which uses `tsx` to run the TypeScript file) or by executing the compiled binary.

```bash
# Using npm start (pass arguments after --)
npm start -- -i -i <path> -s <schema>

# OR using the compiled output
node dist/agama-doc-validator.js -i <path> -s <schema>
```

### CLI Options

| Option | Long Option      | Description                                                                                             |
| :----- | :--------------- | :------------------------------------------------------------------------------------------------------ |
| `-i`   | `--input <path>` | Path to a single DocBook XML file or a directory to scan recursively. Default: the current directory    |
| `-s`   | `--schema <ref>` | Path, URL, or predefined alias to the target JSON Schema. Default: "latest", download the latest schema |
| `-v`   | `--verbose`      | Print out every file being processed and detailed results.                                              |

### Schema Aliases

The tool comes with predefined aliases for quick validation against official Agama schemas:
- `SLE-16.1` : Fetches the profile schema from the SLE-16.1 branch.
- `latest` : Fetches the profile schema from the master branch.

### Examples

1. **Scan a single directory using the `latest` alias:**
   ```bash
   npm start -- -i ../tasks -s latest
   ```

2. **Scan a specific XML file with verbose output:**
   ```bash
   npm start -- -i ../tasks/selinux-policy-containers.xml -s SLE-16.1 -v
   ```

3. **Validate using a local schema file:**
   ```bash
   npm start -- -i ../concepts -s ./my-local-schema.json
   ```
   