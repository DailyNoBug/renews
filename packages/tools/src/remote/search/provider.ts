export interface SearchQuery {
  query: string;
  maxResults?: number;
  filters?: Record<string, unknown>;
}

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  source?: string;
}

export interface SearchProvider {
  search(query: SearchQuery): Promise<SearchResultItem[]>;
}

export class RemoteSearchProvider implements SearchProvider {
  constructor(
    private readonly apiBaseURL: string,
    private readonly apiKey: string,
  ) {}

  async search(query: SearchQuery): Promise<SearchResultItem[]> {
    const response = await fetch(new URL("/search", this.apiBaseURL), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(query),
    });
    if (!response.ok) {
      throw new Error(`Remote search failed with status ${response.status}`);
    }
    return (await response.json()) as SearchResultItem[];
  }
}
