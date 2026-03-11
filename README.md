# slicode

Turn [simple Markdown](example.md) into beautiful [Slidev](https://sli.dev) presentations with animated code transitions.

[screen.webm](https://github.com/user-attachments/assets/b868208f-f7c0-417e-9f47-f6601fcbda70)

## Why not just Slidev?

> Slidev is awesome — but you have to learn its syntax, layouts, Vue components, and config. 
`slicode` lets you skip all that. 
Write a plain Markdown file that reads well on its own, run one command, and get a polished presentation with animated code transitions, smooth morphing, and a sliding code panel — all out of the box.

**Use `slicode` when you want to:**
- Present your code without fighting with slide layout
- Go from README to talk in 30 seconds
- Keep your slides readable as a plain `.md` file

## Quick Start

```bash
npx slicode example.md --open
```

Or install globally:

```bash
npm install -g slicode
```

## Usage

```bash
slicode <input> [output-dir] [slidev-args...]
```

- `input` — local `.md` file or URL (direct link, GitHub file, or gist)
- `output-dir` — where to generate the Slidev project (default: `output`)
- Any extra arguments are passed directly to the [Slidev CLI](https://sli.dev/builtin/cli) — all Slidev flags and subcommands work

```bash
# Local file
slicode example.md --open

# Direct URL
slicode https://example.com/talk.md --open

# GitHub file (auto-resolves to raw)
slicode https://github.com/just-ai/slicode/blob/main/example.md

# GitHub gist
slicode https://gist.github.com/user/abc123 --open

# Build static SPA
slicode example.md build
```

## Markdown Format

### Centered slides — `#`

```md
# Welcome

This text is centered on the slide.
```

### Two-column slides — `##`

Heading and text on the left, code on the right:

```md
## Getting Started

Here's a simple example.

​```python
print("hello")
​```
```

### Click-through states

Consecutive `##` sections with code blocks become animated click states on a single slide. Code transitions use [Magic Move](https://sli.dev/features/magic-move), text crossfades smoothly:

```md
## Step 1

Define a function.

​```python
def greet():
    pass
​```

Add the body.

​```python
def greet():
    print("hello")
​```

## Step 2

Call it.

​```python
def greet():
    print("hello")

greet()
​```
```

This produces **one** two-column slide with **3 click states**:
- Click 0: "Step 1" heading, first text, first code
- Click 1: same heading (no animation), second text, code morphs
- Click 2: heading changes to "Step 2" (animated), third text, code morphs again

## Themes

Set the theme in frontmatter:

```md
---
theme: github-dark
---
```

### Built-in themes

| Theme | Style |
|-------|-------|
| `claude` | Warm beige, serif headings (default) |
| `dark` | Deep navy, Space Grotesk |
| `nord` | Arctic light, IBM Plex |
| `ocean` | Steel blue, Source Sans |
| `rose` | Soft pink, DM Sans |
| `github` | GitHub Light |
| `github-dark` | GitHub Dark |
| `gemini` | Google Gemini style |
| `jetbrains` | JetBrains Light |
| `jetbrains-dark` | JetBrains Darcula |
| `vscode` | VS Code Dark Modern |
| `vscode-light` | VS Code Light |

### Custom overrides

Override any theme variable in frontmatter:

```md
---
theme: claude
accent: #FF6600
bg: #FFFFF0
font-heading: Playfair Display, serif
font-code: Fira Code, monospace
google-fonts: Playfair+Display:wght@700&family=Fira+Code:wght@400
---
```

All available properties:

| Property | Description |
|----------|-------------|
| `bg` | Slide background color |
| `text` | Primary text color |
| `text-secondary` | Secondary text color |
| `accent` | Accent color (headings, highlights) |
| `code-bg` | Code panel background |
| `code-bg-light` | Code panel lighter shade |
| `right-bg-from` | Right column gradient start |
| `right-bg-to` | Right column gradient end |
| `font-heading` | Font for headings |
| `font-body` | Font for body text |
| `font-code` | Font for code blocks |
| `google-fonts` | Google Fonts families to load |

## Full Example

See [example.md](example.md) for a complete working presentation.

## How It Works

slicode parses your Markdown and generates a standalone Slidev project:

- `slides.md` — presentation content with Vue transitions and Magic Move
- `style.css` — themed styles via CSS custom properties
- `layouts/` — custom Vue layout components
- `package.json` — Slidev dependencies

The generated project is self-contained and can be deployed, exported to PDF, or shared independently.
