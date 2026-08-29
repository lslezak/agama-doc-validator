/**
 * @fileoverview JSON schema validation wrapper using Ajv and better-ajv-errors.
 */

import { Ajv } from "ajv";
import { betterAjvErrors } from "@apideck/better-ajv-errors";

import { SchemaDefinition } from "./utils.js";

/**
 * Wrapper class for validating JSON data against a compiled Ajv schema.
 */
export class Validator {
  private ajv: Ajv;
  private validateFn: any;
  private schema: any;

  /**
   * Initializes a new Validator instance with the provided schema definitions.
   *
   * @param {SchemaDefinition[]} schema - An array of schema definitions, where the first is the main schema.
   */
  constructor(schema: SchemaDefinition[]) {
    this.ajv = new Ajv({ allErrors: true, strict: false });

    // the main schema definition is the first in the list
    const main = schema.shift();

    if (main) {
      this.schema = main.schema;

      // load all additional schema definitions
      schema.forEach((def) => {
        this.ajv.addSchema(def.schema);
      });

      // load the main schema definition (the first item in the list)
      this.validateFn = this.ajv.compile(this.schema);
    }
  }

  /**
   * Validates data against the compiled schema and returns an array of error messages.
   *
   * @param {any} data - The JSON data to validate.
   * @returns {string[]} An array of human-readable error messages, or an empty array if valid.
   */
  validate(data: any): string[] {
    const valid = this.validateFn(data);
    if (valid) return [];

    try {
      const betterErrors = betterAjvErrors({
        schema: this.schema,
        data,
        errors: this.validateFn.errors
      });
      return betterErrors.map((err) => err.message);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return (this.validateFn.errors || []).map((err: any) => {
        const path = err.instancePath ? `${err.instancePath}: ` : "";
        return `${path}${err.message || "Unknown validation error"}`;
      });
    }
  }
}
