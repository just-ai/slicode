#!/usr/bin/env node

import { readFileSync, existsSync, watchFile } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync, spawn } from 'node:child_process';

function detectPM(): string {
  for (const pm of ['pnpm', 'yarn', 'npm']) {
    try {
      execSync(`${pm} --version`, { stdio: 'ignore' });
      return pm;
    } catch {}
  }
  return 'npm';
}

function isUrl(input: string): boolean {
  return input.startsWith('http://') || input.startsWith('https://');
}

function resolveRawUrl(url: string): string {
  // GitHub blob URL → raw.githubusercontent.com
  // https://github.com/user/repo/blob/branch/path → https://raw.githubusercontent.com/user/repo/branch/path
  const ghBlob = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
  if (ghBlob) {
    return `https://raw.githubusercontent.com/${ghBlob[1]}/${ghBlob[2]}/${ghBlob[3]}`;
  }
  // GitHub gist URL → raw
  // https://gist.github.com/user/id → append /raw
  const ghGist = url.match(/^https?:\/\/gist\.github\.com\/([^/]+)\/([a-f0-9]+)\/?$/);
  if (ghGist) {
    return `${url.replace(/\/$/, '')}/raw`;
  }
  return url;
}

async function fetchMarkdown(url: string): Promise<string> {
  const rawUrl = resolveRawUrl(url);
  const res = await fetch(rawUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${rawUrl}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

import { parseMarkdown } from './parser.js';
import { generateSlidevProject, regenerateSlides } from './generator.js';

// Split args: positional (input, output) then everything else goes to slidev
const rawArgs = process.argv.slice(2);
const positional: string[] = [];
const slidevArgs: string[] = [];

const slidevCommands = new Set(['build', 'export', 'format', 'theme']);

let pastPositional = false;
for (const arg of rawArgs) {
  if (arg === '--') {
    pastPositional = true;
  } else if (pastPositional || arg.startsWith('-')) {
    slidevArgs.push(arg);
  } else if (positional.length === 0) {
    positional.push(arg);
  } else if (positional.length === 1 && slidevCommands.has(arg)) {
    // Known slidev subcommand — not an output dir
    slidevArgs.push(arg);
  } else if (positional.length < 2) {
    positional.push(arg);
  } else {
    slidevArgs.push(arg);
  }
}

if (positional.length === 0) {
  console.error('Usage: slicode <input> [output-dir] [slidev-args...]');
  console.error('');
  console.error('Generates a Slidev project from Markdown. Input can be a local file');
  console.error('or a URL (direct link or GitHub file/gist URL).');
  console.error('Any extra arguments are passed to Slidev CLI (https://sli.dev/builtin/cli).');
  console.error('');
  console.error('Examples:');
  console.error('  slicode example.md                   # local file');
  console.error('  slicode example.md --open            # dev server, open browser');
  console.error('  slicode https://example.com/talk.md  # direct URL');
  console.error('  slicode https://github.com/user/repo/blob/main/slides.md');
  console.error('  slicode https://gist.github.com/user/abc123');
  console.error('  slicode example.md build             # build static SPA');
  process.exit(1);
}

const input = positional[0];
const isRemote = isUrl(input);
const inputFile = isRemote ? null : resolve(input);
const outputDir = resolve(positional[1] || 'output');

function readMarkdown(): string {
  return readFileSync(inputFile!, 'utf-8');
}

function generate(markdown: string) {
  const presentation = parseMarkdown(markdown);
  console.log(`Theme: ${presentation.meta.theme || 'claude'}`);
  console.log(`Slides: ${presentation.slides.length}`);
  return presentation;
}

async function main() {
  const markdown = isRemote ? await fetchMarkdown(input) : readMarkdown();
  const presentation = generate(markdown);
  generateSlidevProject(presentation, outputDir);
  console.log(`\nSlidev project generated in: ${outputDir}`);

  // Auto-add --base ./ for build so the output works when opened directly
  if (slidevArgs.includes('build') && !slidevArgs.some((a) => a.startsWith('--base'))) {
    slidevArgs.push('--base', './');
  }

  if (slidevArgs.length > 0) {
    const pm = detectPM();
    const run = pm === 'npm' ? 'npx' : pm;

    if (!existsSync(join(outputDir, 'node_modules'))) {
      console.log(`Installing dependencies with ${pm}...`);
      execSync(`${pm} install`, { cwd: outputDir, stdio: 'inherit' });
    }

    // Watch source file for changes (local files only)
    if (inputFile) {
      watchFile(inputFile, { interval: 300 }, () => {
        console.log(`\n--- ${new Date().toLocaleTimeString()} Source changed, regenerating... ---`);
        try {
          const updated = generate(readMarkdown());
          regenerateSlides(updated, outputDir);
          console.log('Slides regenerated. Slidev will hot-reload.\n');
        } catch (err: any) {
          console.error('Regeneration failed:', err.message);
        }
      });
      console.log(`Watching ${inputFile} for changes...`);
    }

    console.log(`Starting: slidev ${slidevArgs.join(' ')}`);
    const child = spawn(run, ['slidev', ...slidevArgs], { cwd: outputDir, stdio: 'inherit' });
    child.on('exit', (code) => process.exit(code ?? 0));
  } else {
    const pm = detectPM();
    const run = pm === 'npm' ? 'npx' : pm;
    console.log(`cd ${outputDir} && ${pm} install && ${run} slidev`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
