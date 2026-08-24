import * as core from "@actions/core";
import { runValidator } from "./runner.js";

/**
 * This file is the actual logic of the action
 * @returns {Promise<void>} Resolves when the action is complete
 */
export async function run(): Promise<void> {
  try {
    const mode = core.getInput("mode");
    const all = mode === "all";
    const missing = mode === "missing";

    return runValidator(
      core.getInput("path"),
      core.getInput("schema"),
      core.getBooleanInput("verbose"),
      all,
      missing
    );
  } catch (error: any) {
    core.setFailed(error.message);
  }
}
