import { writeFileSync, readFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Slide, Presentation, PresentationMeta } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const themesDir = join(__dirname, '..', 'themes');

function loadThemeCss(meta: PresentationMeta): string {
  const themeName = meta.theme || 'claude';
  const themeFile = join(themesDir, `${themeName}.css`);
  if (!existsSync(themeFile)) {
    console.warn(`Theme "${themeName}" not found, falling back to "claude"`);
    return readFileSync(join(themesDir, 'claude.css'), 'utf-8');
  }
  return readFileSync(themeFile, 'utf-8');
}

// Maps camelCase override keys to CSS custom property names
const overrideKeyToCssProp: Record<string, string> = {
  bg: '--slicode-bg',
  text: '--slicode-text',
  textSecondary: '--slicode-text-secondary',
  accent: '--slicode-accent',
  codeBg: '--slicode-code-bg',
  codeBgLight: '--slicode-code-bg-light',
  rightBgFrom: '--slicode-right-bg-from',
  rightBgTo: '--slicode-right-bg-to',
  fontHeading: '--font-heading',
  fontBody: '--font-body',
  fontCode: '--font-code',
  h1Weight: '--h1-weight',
  h2Weight: '--h2-weight',
  h3Weight: '--h3-weight',
  h4Weight: '--h4-weight',
  h5Weight: '--h5-weight',
  h6Weight: '--h6-weight',
};

function overridesToCss(overrides: Record<string, string>): string {
  const lines = Object.entries(overrides)
    .map(([key, val]) => {
      const prop = overrideKeyToCssProp[key];
      return prop ? `  ${prop}: ${val};` : null;
    })
    .filter(Boolean);
  if (lines.length === 0) return '';
  return `\n:root {\n${lines.join('\n')}\n}\n`;
}

function buildStyleCss(meta: PresentationMeta): string {
  const baseCss = readFileSync(join(__dirname, '..', 'template', 'styles', 'index.css'), 'utf-8');
  const themeCss = loadThemeCss(meta);
  let css = themeCss + '\n' + baseCss;
  if (meta.overrides) {
    css += overridesToCss(meta.overrides);
  }
  return css;
}

const terminalLanguages = new Set(['bash', 'shell', 'sh', 'zsh', 'console', 'terminal']);

function isTerminal(lang: string): boolean {
  return terminalLanguages.has(lang);
}

function headingMarkdown(text: string, level: number): string {
  return '#'.repeat(level) + ' ' + text;
}

function generateCenteredSlide(slide: Slide): string {
  const state = slide.states[0];
  const lines: string[] = [
    '---',
    'layout: centered',
    'transition: view-transition',
    '---',
    '',
    headingMarkdown(state.heading, state.headingLevel),
    '',
    state.text,
  ];
  return lines.join('\n');
}

function computeCodeMetrics(slide: Slide): { lines: number; chars: number }[] {
  return slide.states.map((state) => {
    if (!state.codeBlock) return { lines: 0, chars: 0 };
    const codeLines = state.codeBlock.code.split('\n');
    let maxChars = 0;
    for (const line of codeLines) {
      if (line.length > maxChars) maxChars = line.length;
    }
    return { lines: codeLines.length, chars: maxChars };
  });
}

function hasAnyCode(slide: Slide): boolean {
  return slide.states.some((s) => !!s.codeBlock);
}

function generateTwoColumnSlide(slide: Slide): string {
  const { states } = slide;
  const metrics = computeCodeMetrics(slide);
  const metricsCsv = metrics.map((m) => `${m.lines}:${m.chars}`).join(',');
  const lines: string[] = [
    '---',
    'layout: two-cols-drawer',
    'transition: view-transition',
    `clicks: ${states.length - 1}`,
    `codeMetrics: "${metricsCsv}"`,
    '---',
    '',
  ];

  // Left column: single v-switch with heading at top + text centered
  if (states.length === 1) {
    lines.push(`<div class="slide-heading">`);
    lines.push('');
    lines.push(headingMarkdown(states[0].heading, states[0].headingLevel));
    lines.push('');
    lines.push('</div>');
    lines.push(`<div class="slide-text">`);
    lines.push('');
    lines.push(states[0].text);
    lines.push('');
    lines.push('</div>');
  } else {
    // Heading: keyed by content — no animation when text stays the same
    // Build a map of click index to heading key
    const headingKeys: string[] = [];
    const uniqueHeadings: string[] = [];
    for (const s of states) {
      const h = `${s.headingLevel}:${s.heading}`;
      let idx = uniqueHeadings.indexOf(h);
      if (idx === -1) {
        idx = uniqueHeadings.length;
        uniqueHeadings.push(h);
      }
      headingKeys.push(String(idx));
    }

    // Group consecutive states with the same heading into single branches
    interface HeadingGroup { key: string; startIdx: number; endIdx: number; state: typeof states[0]; }
    const headingGroups: HeadingGroup[] = [];
    for (let i = 0; i < states.length; i++) {
      const last = headingGroups[headingGroups.length - 1];
      if (last && headingKeys[i] === last.key) {
        last.endIdx = i;
      } else {
        headingGroups.push({ key: headingKeys[i], startIdx: i, endIdx: i, state: states[i] });
      }
    }

    lines.push('<Transition name="text-morph">');
    for (let g = 0; g < headingGroups.length; g++) {
      const grp = headingGroups[g];
      let cond: string;
      if (g === 0 && headingGroups.length === 1) {
        cond = ''; // only one group, no condition needed — but Transition needs v-if
        cond = `v-if="true"`;
      } else if (g === 0) {
        if (grp.startIdx === grp.endIdx) {
          cond = `v-if="$clicks === ${grp.startIdx}"`;
        } else {
          cond = `v-if="$clicks <= ${grp.endIdx}"`;
        }
      } else if (g === headingGroups.length - 1) {
        cond = 'v-else';
      } else {
        if (grp.startIdx === grp.endIdx) {
          cond = `v-else-if="$clicks === ${grp.startIdx}"`;
        } else {
          cond = `v-else-if="$clicks <= ${grp.endIdx}"`;
        }
      }
      lines.push(`<div class="slide-heading" ${cond} :key="'h${grp.key}'">`);
      lines.push('');
      lines.push(headingMarkdown(grp.state.heading, grp.state.headingLevel));
      lines.push('');
      lines.push('</div>');
    }
    lines.push('</Transition>');

    // Text: always keyed by click index — always animates
    lines.push('<Transition name="text-morph">');
    for (let i = 0; i < states.length; i++) {
      const cond = i === 0
        ? `v-if="$clicks === ${i}"`
        : i === states.length - 1
          ? 'v-else'
          : `v-else-if="$clicks === ${i}"`;
      lines.push(`<div class="slide-text" ${cond} :key="${i}">`);
      lines.push('');
      lines.push(states[i].text);
      lines.push('');
      lines.push('</div>');
    }
    lines.push('</Transition>');
  }

  // Right column
  lines.push('');
  lines.push('::right::');
  lines.push('');

  const allCode = states.every((s) => !!s.codeBlock);

  if (allCode && states.length === 1) {
    const cb = states[0].codeBlock!;
    if (isTerminal(cb.language)) lines.push('<div class="terminal-window">');
    lines.push('```' + cb.language);
    lines.push(cb.code);
    lines.push('```');
    if (isTerminal(cb.language)) lines.push('</div>');
  } else if (allCode) {
    // Pure code — magic move
    const allTerminal = states.every((s) => isTerminal(s.codeBlock!.language));
    if (allTerminal) lines.push('<div class="terminal-window">');
    lines.push('````md magic-move {at:1}');
    for (const state of states) {
      const cb = state.codeBlock!;
      lines.push('```' + cb.language);
      lines.push(cb.code);
      lines.push('```');
    }
    lines.push('````');
    if (allTerminal) lines.push('</div>');
  } else {
    // Mixed content — group consecutive code into magic-move, images via v-if
    interface RightGroup { type: 'code' | 'image'; startIdx: number; endIdx: number; }
    const groups: RightGroup[] = [];
    for (let i = 0; i < states.length; i++) {
      const t = states[i].codeBlock ? 'code' : 'image';
      const last = groups[groups.length - 1];
      if (last && last.type === t) {
        last.endIdx = i;
      } else {
        groups.push({ type: t as 'code' | 'image', startIdx: i, endIdx: i });
      }
    }

    for (const grp of groups) {
      const count = grp.endIdx - grp.startIdx + 1;

      if (grp.type === 'image') {
        for (let i = grp.startIdx; i <= grp.endIdx; i++) {
          const img = states[i].image!;
          const cond = i === 0
            ? `v-if="$clicks === ${i}"`
            : i === states.length - 1
              ? `v-else-if="$clicks >= ${i}"`
              : `v-else-if="$clicks === ${i}"`;
          lines.push(`<img ${cond} src="${img.url}" alt="${img.alt}" class="right-image" />`);
        }
      } else if (count === 1) {
        const cb = states[grp.startIdx].codeBlock!;
        const term = isTerminal(cb.language);
        const cond = grp.startIdx === 0
          ? `v-if="$clicks === ${grp.startIdx}"`
          : grp.endIdx === states.length - 1
            ? `v-else-if="$clicks >= ${grp.startIdx}"`
            : `v-else-if="$clicks === ${grp.startIdx}"`;
        lines.push(`<div ${cond}>`);
        if (term) lines.push('<div class="terminal-window">');
        lines.push('');
        lines.push('```' + cb.language);
        lines.push(cb.code);
        lines.push('```');
        lines.push('');
        if (term) lines.push('</div>');
        lines.push('</div>');
      } else {
        // Multiple consecutive code states — magic-move
        const allTerminal = (() => {
          for (let i = grp.startIdx; i <= grp.endIdx; i++) {
            if (!isTerminal(states[i].codeBlock!.language)) return false;
          }
          return true;
        })();
        const cond = grp.startIdx === 0
          ? `v-if="$clicks <= ${grp.endIdx}"`
          : grp.endIdx === states.length - 1
            ? `v-else-if="$clicks >= ${grp.startIdx}"`
            : `v-else-if="$clicks >= ${grp.startIdx} && $clicks <= ${grp.endIdx}"`;
        lines.push(`<div ${cond}>`);
        if (allTerminal) lines.push('<div class="terminal-window">');
        lines.push('');
        lines.push(`\`\`\`\`md magic-move {at:${grp.startIdx === 0 ? 1 : grp.startIdx + 1}}`);
        for (let i = grp.startIdx; i <= grp.endIdx; i++) {
          const cb = states[i].codeBlock!;
          lines.push('```' + cb.language);
          lines.push(cb.code);
          lines.push('```');
        }
        lines.push('````');
        lines.push('');
        if (allTerminal) lines.push('</div>');
        lines.push('</div>');
      }
    }
  }

  return lines.join('\n');
}

function generateSlidesMarkdown(slides: Slide[]): string {
  const parts: string[] = [];

  for (const slide of slides) {
    if (slide.type === 'centered') {
      parts.push(generateCenteredSlide(slide));
    } else {
      parts.push(generateTwoColumnSlide(slide));
    }
  }

  return parts.join('\n\n') + '\n';
}

export function regenerateSlides(presentation: Presentation, outputDir: string): void {
  const { meta, slides } = presentation;

  // Update slides.md
  writeFileSync(join(outputDir, 'slides.md'), generateSlidesMarkdown(slides));

  // Update style.css with theme
  writeFileSync(join(outputDir, 'style.css'), buildStyleCss(meta));

  // Copy layouts in case they changed
  const templateDir = join(__dirname, '..', 'template');
  if (existsSync(join(templateDir, 'layouts'))) {
    cpSync(join(templateDir, 'layouts'), join(outputDir, 'layouts'), { recursive: true });
  }
}

export function generateSlidevProject(presentation: Presentation, outputDir: string): void {
  const { meta, slides } = presentation;

  // Create output directory structure
  mkdirSync(join(outputDir, 'layouts'), { recursive: true });

  // Generate slides.md
  writeFileSync(join(outputDir, 'slides.md'), generateSlidesMarkdown(slides));

  // Copy template files and generate themed style.css
  const templateDir = join(__dirname, '..', 'template');
  if (existsSync(templateDir)) {
    cpSync(join(templateDir, 'layouts'), join(outputDir, 'layouts'), { recursive: true });

    // Generate themed style.css
    writeFileSync(join(outputDir, 'style.css'), buildStyleCss(meta));
  }

  // Generate package.json for the Slidev project
  const packageJson = {
    name: 'slicode-presentation',
    private: true,
    scripts: {
      dev: 'slidev',
      build: 'slidev build',
      export: 'slidev export',
    },
    dependencies: {
      '@slidev/cli': '^51.0.0',
      '@slidev/theme-default': '^0.25.0',
    },
  };
  writeFileSync(join(outputDir, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');

  // Generate .gitignore
  writeFileSync(join(outputDir, '.gitignore'), 'node_modules\ndist\n');
}
