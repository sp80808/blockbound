// Node module hooks: load the game's TypeScript sources directly (transpiled
// in-memory, never emitted) so integration tests exercise the real modules.
// Relative extensionless imports resolve to .ts/.tsx; bare imports (zustand)
// fall through to default resolution. Type errors remain tsc's job.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, extname, resolve as resolvePath } from 'node:path';
import * as ts from 'typescript';

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') || specifier.startsWith('file:')) {
    const parentDir = context.parentURL ? dirname(fileURLToPath(context.parentURL)) : process.cwd();
    const base = specifier.startsWith('file:') ? fileURLToPath(specifier) : resolvePath(parentDir, specifier);
    const candidates = extname(base) ? [base] : [base + '.ts', base + '.tsx', base + '/index.ts'];
    for (const candidate of candidates) {
      if (existsSync(candidate) && isFile(candidate)) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts') || url.endsWith('.tsx')) {
    const source = readFileSync(fileURLToPath(url), 'utf8');
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX
      }
    });
    return { format: 'module', source: transpiled.outputText, shortCircuit: true };
  }
  return nextLoad(url, context);
}
