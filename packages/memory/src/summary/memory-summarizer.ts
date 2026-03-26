export class MemorySummarizer {
  summarize(records: Array<{ key: string; value: unknown; updatedAt: string }>): string {
    return records
      .slice(0, 12)
      .map((record) => `${record.key}: ${JSON.stringify(record.value)}`)
      .join("\n");
  }
}
