export type SlideType = 'centered' | 'two-column';

export interface CodeBlock {
  language: string;
  code: string;
}

export interface ImageBlock {
  url: string;
  alt: string;
}

export interface ContentState {
  heading: string;
  headingLevel: number;
  text: string;
  codeBlock?: CodeBlock;
  image?: ImageBlock;
}

export interface Slide {
  type: SlideType;
  states: ContentState[];
}

export interface PresentationMeta {
  theme?: string;
  overrides?: Record<string, string>;
}

export interface Presentation {
  meta: PresentationMeta;
  slides: Slide[];
}
