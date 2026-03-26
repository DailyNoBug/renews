import type { SearchProvider, SearchResultItem } from "@renews/tools/index";

export class SearcherAgent {
  constructor(private readonly provider: SearchProvider) {}

  search(query: string, maxResults = 8): Promise<SearchResultItem[]> {
    return this.provider.search({
      query,
      maxResults,
    });
  }
}
