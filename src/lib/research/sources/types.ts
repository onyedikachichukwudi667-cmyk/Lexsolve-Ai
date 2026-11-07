export interface RawHit {
  name: string;
  kind: "case" | "statute";
  citation?: string;
  court?: string;
  year?: number;
  section?: string;
  snippet?: string;
  url?: string;
  ref?: string; // source-specific identifier used to fetch the full text
  score?: number; // 0..1 relevance if the source supplies one
}

// Every legal database implements this interface. Adding a new source means adding one file
// in this folder and registering it in index.ts. Nothing else in the app changes.
export interface LegalSource {
  id: string;
  name: string;
  isConfigured(): boolean;
  search(query: string, opts: { kind: "case" | "statute"; limit: number }): Promise<RawHit[]>;
  fetchFull?(hit: RawHit): Promise<{ text: string; url?: string } | null>;
  lookupCitation?(citation: string): Promise<RawHit | null>;
}
