import Ajv from "ajv";
import { betterAjvErrors } from "@apideck/better-ajv-errors";

import { SchemaDefinition } from "./utils";

export class Validator {
  private ajv: Ajv;
  private validateFn: any;
  private schema: any;

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

  validate(data: any): string[] {
    const valid = this.validateFn(data);
    if (valid) return [];

    try {
      const betterErrors = betterAjvErrors({
        schema: this.schema,
        data,
        errors: this.validateFn.errors,
      });
      return betterErrors.map((err) => err.message);
    } catch (e) {
      return (this.validateFn.errors || []).map((err: any) => {
        const path = err.instancePath ? `${err.instancePath}: ` : "";
        return `${path}${err.message || "Unknown validation error"}`;
      });
    }
  }
}
