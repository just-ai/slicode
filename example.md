# Slicode

Turn Markdown into animated presentations

## How It Works

Write a regular Markdown file with headings and code blocks

- `#` headings create **centered** title slides
- `##` headings with code create **two-column** slides
- Consecutive code blocks become click-through states

```yaml
# frontmatter selects the theme
---
theme: claude
---

# Title Slide          ← centered
Subtitle text

## Feature             ← two-column
Explanation on left
  [code on right]

## Next Step           ← merged with above
More text
  [code animates via Magic Move]
```

## Magic Move

Consecutive sections merge into one slide — each click animates the code

```python
def greet(name):
    print(f"Hello, {name}!")
```

The code morphs smoothly between states

```python
def greet(name, greeting="Hello"):
    message = f"{greeting}, {name}!"
    print(message)
    return message
```

Add more logic — Magic Move highlights the diff

```python
def greet(name, greeting="Hello"):
    message = f"{greeting}, {name}!"
    print(message)
    return message

def greet_all(names):
    return [greet(name) for name in names]
```

## Themes

Pick a theme in the frontmatter block

```yaml
---
theme: github-dark
---
```

12 built-in themes to choose from

```yaml
# Light themes
theme: claude        # warm beige, serif headings
theme: github        # classic GitHub style
theme: nord          # arctic, IBM Plex fonts
theme: ocean         # steel blue tones
theme: rose          # soft pink accents
theme: jetbrains     # IntelliJ-inspired
theme: vscode-light  # VS Code light

# Dark themes
theme: dark          # deep navy, Space Grotesk
theme: github-dark   # GitHub dark mode
theme: jetbrains-dark
theme: vscode        # VS Code dark
theme: gemini        # Google Gemini style
```

## Custom Overrides

Override any theme variable directly in the frontmatter

```yaml
---
theme: claude
accent: #E53E6B
font-heading: Playfair Display, serif
bg: #FFFFF0
---
```

All available override keys

```yaml
bg: #FFFFFF              # slide background
text: #1A1A1A            # primary text color
text-secondary: #666666  # secondary text
accent: #0969DA          # headings & highlights
code-bg: #24292E         # code panel background
code-bg-light: #2D3339   # lighter shade
right-bg-from: #2D3339   # right gradient start
right-bg-to: #24292E     # right gradient end
font-heading: Inter, sans-serif
font-body: Inter, sans-serif
font-code: Fira Code, monospace
h1-weight: 700           # heading font weights
h2-weight: 600
```

## Rich Content

Slide text supports full Markdown — not just paragraphs

- Bullet lists
- **Bold** and *italic* text
- Inline `code` spans

```typescript
interface Slide {
  type: 'centered' | 'two-column'
  states: ContentState[]
}

interface ContentState {
  heading: string
  text: string
  codeBlock?: CodeBlock
  image?: ImageBlock
}
```

## Images

Use images instead of code — they go in the right panel too

![Architecture](https://picsum.photos/800/600?random=1)

# Getting Started

Install and present in seconds

## CLI Usage

Works with local files and URLs

```bash
npm install -g slicode

slicode slides.md --open
```

Pass a GitHub link or gist — it resolves automatically

```bash
# Local file
slicode slides.md --open

# GitHub file (auto-resolves to raw)
slicode https://github.com/user/repo/blob/main/slides.md

# GitHub gist
slicode https://gist.github.com/user/abc123 --open

# Any Slidev CLI args work
slicode slides.md build
```

## Live Reload

Edit your source Markdown while the server is running

```bash
# Terminal 1: start with dev server
slicode slides.md --open

# Terminal 2: edit your markdown
vim slides.md
# Save → presentation updates automatically
```

The watcher detects changes and regenerates instantly

```bash
# Output when a change is detected:
# --- 14:32:05 Source changed, regenerating... ---
# Theme: claude
# Slides: 8
# Slides regenerated. Slidev will hot-reload.
```

# Start Building

`npm install -g slicode`
