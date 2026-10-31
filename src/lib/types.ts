export type Status = "SOURCED" | "INFERRED" | "UNKNOWN";

export interface Chunk {
  id: string;
  src: "docs" | "user-guide" | "blog" | "glossary" | "website";
  url: string;
  title: string;
  heading: string;
  date: string;
  text: string;
}

export interface Citation {
  url: string;
  title: string;
  heading: string;
  src: Chunk["src"];
  quote: string;
  /** true when the quote was found verbatim in the cited public page text */
  verified: boolean;
}

export interface Excerpt {
  url: string;
  title: string;
  heading: string;
  src: Chunk["src"];
  snippet: string;
}

export interface Answer {
  question: string;
  status: Status;
  answer: string;
  /** For INFERRED: the reasoning step from sourced fact to the claim. */
  reasoning?: string;
  citations: Citation[];
  followUp: string;
  /** Top retrieved passages, shown even when the model found nothing. */
  excerpts: Excerpt[];
  mode: "llm" | "retrieval-only";
  model?: string;
  error?: string;
}
