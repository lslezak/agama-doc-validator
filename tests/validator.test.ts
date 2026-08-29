import { describe, it } from "node:test";
import * as assert from "node:assert";
import { Validator } from "../src/validator.js";
import { SchemaDefinition } from "../src/utils.js";

describe("Validator", () => {
  it("should return an empty array for valid data", () => {
    const schemaDef: SchemaDefinition[] = [
      {
        uri: "main.json",
        schema: {
          type: "object",
          properties: {
            name: { type: "string" }
          },
          required: ["name"]
        }
      }
    ];

    const validator = new Validator(schemaDef);
    const errors = validator.validate({ name: "Agama" });
    assert.deepStrictEqual(errors, []);
  });

  it("should return formatted errors for invalid data", () => {
    const schemaDef: SchemaDefinition[] = [
      {
        uri: "main.json",
        schema: {
          type: "object",
          properties: {
            name: { type: "string" }
          },
          required: ["name"]
        }
      }
    ];

    const validator = new Validator(schemaDef);
    const errors = validator.validate({ age: 10 });
    assert.strictEqual(errors.length, 1);
    assert.match(errors[0], /must have required property 'name'/i);
  });

  it("should resolve referenced schemas", () => {
    const schemas: SchemaDefinition[] = [
      {
        uri: "main.json",
        schema: {
          type: "object",
          properties: {
            refData: { $ref: "sub.json" }
          }
        }
      },
      {
        uri: "sub.json",
        schema: {
          $id: "sub.json",
          type: "string"
        }
      }
    ];

    const validator = new Validator(schemas);
    assert.deepStrictEqual(validator.validate({ refData: "valid" }), []);

    const errors = validator.validate({ refData: 123 });
    assert.strictEqual(errors.length, 1);
    assert.match(errors[0], /property type must be string/i);
  });
});
