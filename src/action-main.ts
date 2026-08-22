import * as core from "@actions/core";
import { runValidator } from "./runner";

/**
 * This file is the actual logic of the action
 * @returns {Promise<void>} Resolves when the action is complete
 */
export async function run(): Promise<void> {
  try {
    return runValidator(
      core.getInput("input"),
      core.getInput("schema"),
      core.getBooleanInput("verbose"),
    );
  } catch (error: any) {
    core.setFailed(error.message);
  }
}
