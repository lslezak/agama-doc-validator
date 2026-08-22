#!/usr/bin/env node

import { Command } from 'commander';
import { runValidator } from './runner';
import pc from 'picocolors';
import * as pkg from '../package.json';

const program = new Command();

program
  .name('agama-doc-validator')
  .description(`DocBook JSON Validator for Agama Project\nVersion: ${pkg.version}`)
  .version(pkg.version)
  .helpOption('-h, --help', 'display this help')
  .option('-i, --input <path>', 'path to the DocBook XML file or directory to scan', ".")
  .option('-s, --schema <path|url|alias>', 'path, URL, or predefined alias to the target JSON Schema (e.g., "SLE-16.0", or "latest")', "latest")
  .option('-v, --verbose', 'print more information while processing the files')
  .option('-a, --all', 'scan and validate all <screen> tags (by default, only tags with language="agama-json" are validated)')
  .action(async (options) => {
    try {
      await runValidator(options.input, options.schema, options.verbose, options.all);
    } catch (error: any) {
      if (options.verbose) console.log(error);
      console.error(pc.red(`\nFatal Error: ${error.message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);
