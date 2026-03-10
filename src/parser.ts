import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import type { Root, Heading, Code, Text, InlineCode, Image, Paragraph } from 'mdast';
import type { ContentState, Slide, PresentationMeta, Presentation, ImageBlock } from './types.js';

const serializer = unified().use(remarkStringify, { bullet: '-', emphasis: '*', strong: '*' });

interface Section {
  heading: string;
  headingLevel: number;
  text: string;
  codeBlock?: { language: string; code: string };
  image?: ImageBlock;
}

function isImageParagraph(node: any): node is Paragraph {
  return node.type === 'paragraph'
    && node.children.length === 1
    && node.children[0].type === 'image';
}

function nodesToMarkdown(nodes: any[]): string {
  if (nodes.length === 0) return '';
  const tree: Root = { type: 'root', children: nodes };
  return serializer.stringify(tree).trim();
}

function extractHeadingText(node: Heading): string {
  return node.children
    .map((child) => {
      if (child.type === 'text') return (child as Text).value;
      if (child.type === 'inlineCode') return `\`${(child as InlineCode).value}\``;
      return '';
    })
    .join('');
}

function parseSections(tree: Root): Section[] {
  const sections: Section[] = [];
  let currentHeading = '';
  let currentHeadingLevel = 1;
  let currentTextNodes: any[] = [];
  let currentCode: { language: string; code: string } | undefined;
  let currentImage: ImageBlock | undefined;

  function hasRightContent() {
    return currentCode || currentImage;
  }

  function flush() {
    const text = nodesToMarkdown(currentTextNodes);
    if (currentHeading || text || hasRightContent()) {
      sections.push({
        heading: currentHeading,
        headingLevel: currentHeadingLevel,
        text,
        codeBlock: currentCode,
        image: currentImage,
      });
      currentTextNodes = [];
      currentCode = undefined;
      currentImage = undefined;
    }
  }

  for (const node of tree.children) {
    if (node.type === 'html') continue; // skip comments

    if (node.type === 'heading') {
      const heading = node as Heading;
      flush();
      currentHeading = extractHeadingText(heading);
      currentHeadingLevel = heading.depth;
    } else if (node.type === 'code') {
      if (hasRightContent()) {
        flush();
      }
      const code = node as Code;
      currentCode = {
        language: code.lang || '',
        code: code.value,
      };
    } else if (isImageParagraph(node)) {
      if (hasRightContent()) {
        flush();
      }
      const img = node.children[0] as Image;
      currentImage = { url: img.url, alt: img.alt || '' };
    } else {
      // Any other node (paragraph, list, blockquote, thematicBreak, table, etc.)
      if (hasRightContent()) {
        flush();
      }
      currentTextNodes.push(node);
    }
  }

  flush();
  return sections;
}

// Maps frontmatter kebab-case keys to ThemeVars camelCase keys
const frontmatterToThemeKey: Record<string, string> = {
  bg: 'bg',
  text: 'text',
  'text-secondary': 'textSecondary',
  accent: 'accent',
  'code-bg': 'codeBg',
  'code-bg-light': 'codeBgLight',
  'right-bg-from': 'rightBgFrom',
  'right-bg-to': 'rightBgTo',
  'font-heading': 'fontHeading',
  'font-body': 'fontBody',
  'font-code': 'fontCode',
  'h1-weight': 'h1Weight',
  'h2-weight': 'h2Weight',
  'h3-weight': 'h3Weight',
  'h4-weight': 'h4Weight',
  'h5-weight': 'h5Weight',
  'h6-weight': 'h6Weight',
  'google-fonts': 'googleFonts',
};

function parseFrontmatter(markdown: string): { meta: PresentationMeta; body: string } {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: markdown };
  const meta: PresentationMeta = {};
  const overrides: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([\w-]+)\s*:\s*(.+)$/);
    if (kv) {
      const key = kv[1].trim();
      const val = kv[2].trim();
      if (key === 'theme') {
        meta.theme = val;
      } else if (frontmatterToThemeKey[key]) {
        overrides[frontmatterToThemeKey[key]] = val;
      }
    }
  }
  if (Object.keys(overrides).length > 0) {
    meta.overrides = overrides;
  }
  return { meta, body: match[2] };
}

export function parseMarkdown(markdown: string): Presentation {
  const { meta, body } = parseFrontmatter(markdown);
  const tree = unified().use(remarkParse).parse(body) as Root;
  const sections = parseSections(tree);

  const slides: Slide[] = [];

  for (const section of sections) {
    const hasRight = !!(section.codeBlock || section.image);
    const type = hasRight ? 'two-column' : 'centered';

    const state: ContentState = {
      heading: section.heading,
      headingLevel: section.headingLevel,
      text: section.text,
      codeBlock: section.codeBlock,
      image: section.image,
    };

    const lastSlide = slides[slides.length - 1];

    if (lastSlide && lastSlide.type === type && type === 'two-column') {
      // Merge consecutive two-column sections as click states
      lastSlide.states.push(state);
    } else {
      // New slide
      slides.push({ type, states: [state] });
    }
  }

  return { meta, slides };
}
