import { describe, it, mock, afterEach, beforeEach } from "node:test";
import * as assert from "node:assert";
import fs from "node:fs";
import { runValidator } from "../src/runner.js";

describe("Runner", () => {
  let logs: string[] = [];

  beforeEach(() => {
    logs = [];
    // Mute console output and capture it to verify messages
    mock.method(console, "log", (msg?: string) => {
      if (msg) logs.push(msg.toString());
    });
    mock.method(console, "error", () => {});

    // Trap process.exit to prevent the test runner from actually exiting on failure
    mock.method(process, "exit", (code: number) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("should process valid JSON snippets without errors", async () => {
    // Mock fetching the schema to prevent network requests
    mock.method(
      globalThis,
      "fetch",
      async () =>
        ({
          ok: true,
          json: async () => ({
            type: "object",
            properties: { product: { type: "string" } },
            required: ["product"]
          })
        }) as Response
    );

    // Mock file system to prevent reading any files from disk
    mock.method(
      fs,
      "statSync",
      () => ({ isFile: () => true, isDirectory: () => false }) as fs.Stats
    );
    mock.method(fs, "existsSync", () => false); // Force fetching via URL/Alias
    mock.method(fs, "readFileSync", () => {
      return `<screen language="agama-json">{"product": "SLES"}</screen>`;
    });

    await runValidator("docs.xml", "latest", false);
    assert.ok(
      logs.some((log) => log.includes("all JSON profiles are well-formed and schema-compliant"))
    );
  });

  it("should report schema violations and exit with code 1", async () => {
    mock.method(
      globalThis,
      "fetch",
      async () =>
        ({
          ok: true,
          json: async () => ({
            type: "object",
            properties: { product: { type: "string" } },
            required: ["product"]
          })
        }) as Response
    );

    mock.method(
      fs,
      "statSync",
      () => ({ isFile: () => true, isDirectory: () => false }) as fs.Stats
    );
    mock.method(fs, "existsSync", () => false);
    mock.method(fs, "readFileSync", () => {
      return `<screen language="agama-json">{"name": "agama"}</screen>`; // violates required 'product'
    });

    await assert.rejects(
      async () => await runValidator("docs.xml", "latest", false),
      /process\.exit\(1\)/
    );

    assert.ok(logs.some((log) => log.includes("SCHEMA VIOLATION")));
    assert.ok(logs.some((log) => log.includes("1 Errors Found")));
  });

  it("should report malformed JSON", async () => {
    mock.method(
      globalThis,
      "fetch",
      async () =>
        ({
          ok: true,
          json: async () => ({})
        }) as Response
    );

    mock.method(
      fs,
      "statSync",
      () => ({ isFile: () => true, isDirectory: () => false }) as fs.Stats
    );
    mock.method(fs, "existsSync", () => false);
    mock.method(fs, "readFileSync", () => {
      return `<screen language="agama-json">{"bad": "json", }</screen>`;
    });

    await assert.rejects(
      async () => await runValidator("docs.xml", "latest", false),
      /process\.exit\(1\)/
    );

    assert.ok(logs.some((log) => log.includes("MALFORMED JSON")));
  });
});
