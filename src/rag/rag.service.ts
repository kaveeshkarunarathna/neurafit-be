import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../database/prisma.service';

export interface KnowledgeChunkResult {
  id: string;
  category: string;
  title: string;
  content: string;
  source: string | null;
  similarity: number;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly genai: GoogleGenAI | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genai = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * Generate a 768-dimensional embedding using Gemini text-embedding-004
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.genai) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const response = await this.genai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text,
      config: { outputDimensionality: 768 },
    });

    return response.embeddings?.[0]?.values ?? [];
  }

  /**
   * Search the knowledge base for chunks relevant to the query.
   * Uses cosine similarity via pgvector's <=> operator.
   */
  async search(
    query: string,
    options: { category?: string; topK?: number } = {},
  ): Promise<KnowledgeChunkResult[]> {
    const { category, topK = 5 } = options;

    let embedding: number[];
    try {
      embedding = await this.generateEmbedding(query);
    } catch (error) {
      this.logger.warn('Failed to generate embedding for RAG search:', error);
      return [];
    }

    if (embedding.length === 0) return [];

    const vectorStr = `[${embedding.join(',')}]`;

    const categoryFilter = category
      ? `AND category = '${category}'::"KnowledgeCategory"`
      : '';

    const results = await this.prisma.$queryRawUnsafe<KnowledgeChunkResult[]>(
      `SELECT id, category, title, content, source,
              1 - (embedding <=> $1::vector) AS similarity
       FROM knowledge_chunks
       WHERE 1=1 ${categoryFilter}
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      vectorStr,
      topK,
    );

    // Filter out low-similarity results (below 0.5 threshold)
    return results.filter((r) => r.similarity >= 0.5);
  }

  /**
   * Format retrieved knowledge chunks into a prompt-friendly context string.
   */
  formatContext(chunks: KnowledgeChunkResult[]): string {
    if (chunks.length === 0) return '';

    const entries = chunks
      .map(
        (c, i) =>
          `[${i + 1}] ${c.title} (${c.category.toLowerCase()}):\n${c.content}${c.source ? ` [Source: ${c.source}]` : ''}`,
      )
      .join('\n\n');

    return `\n--- VERIFIED REFERENCE DATA ---\nThe following facts have been retrieved from a verified knowledge base. Use them to ground your response. If any reference data conflicts with your general knowledge, prefer the reference data.\n\n${entries}\n--- END REFERENCE DATA ---\n`;
  }

  /**
   * Convenience method: search + format in one call.
   */
  async getContext(
    query: string,
    options: { category?: string; topK?: number } = {},
  ): Promise<string> {
    const chunks = await this.search(query, options);
    return this.formatContext(chunks);
  }
}
