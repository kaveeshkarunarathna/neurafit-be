/**
 * Knowledge Base Seeder
 *
 * Seeds the knowledge_chunks table with embeddings from the JSON data files.
 * Run: npx ts-node src/rag/seed-knowledge.ts
 *
 * Requires: DATABASE_URL and GEMINI_API_KEY in .env
 */

import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

interface KnowledgeEntry {
  title: string;
  content: string;
  source?: string;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await genai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: { outputDimensionality: 768 },
  });
  return response.embeddings?.[0]?.values ?? [];
}

async function seedCategory(
  category: 'NUTRITION' | 'EXERCISE' | 'HEALTH',
  filePath: string,
) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const entries: KnowledgeEntry[] = JSON.parse(raw);

  console.log(`\n📂 Seeding ${category} (${entries.length} entries)...`);

  let success = 0;
  let skipped = 0;

  for (const entry of entries) {
    // Check if already seeded (by title + category)
    const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM knowledge_chunks WHERE title = $1 AND category = $2::"KnowledgeCategory" LIMIT 1`,
      entry.title,
      category,
    );

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    const textForEmbedding = `${entry.title}. ${entry.content}`;

    try {
      const embedding = await generateEmbedding(textForEmbedding);

      if (embedding.length === 0) {
        console.warn(`  ⚠ Empty embedding for: ${entry.title}`);
        continue;
      }

      const vectorStr = `[${embedding.join(',')}]`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO knowledge_chunks (id, category, title, content, source, embedding, "createdAt")
         VALUES (gen_random_uuid(), $1::"KnowledgeCategory", $2, $3, $4, $5::vector, NOW())`,
        category,
        entry.title,
        entry.content,
        entry.source || null,
        vectorStr,
      );

      success++;
      process.stdout.write(`  ✓ ${success}/${entries.length} ${entry.title}\r`);

      // Rate limit: Gemini embedding API allows 1500 RPM, but be gentle
      await new Promise((r) => setTimeout(r, 200));
    } catch (error) {
      console.error(`\n  ✗ Failed: ${entry.title}`, error);
    }
  }

  console.log(
    `  ✅ ${category}: ${success} inserted, ${skipped} skipped (already existed)`,
  );
}

async function main() {
  console.log('🧠 NeuraFiT Knowledge Base Seeder');
  console.log('==================================');

  // Ensure pgvector extension exists
  await prisma.$executeRawUnsafe(
    'CREATE EXTENSION IF NOT EXISTS vector',
  );

  // Create the KnowledgeCategory enum if it doesn't exist
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "KnowledgeCategory" AS ENUM ('NUTRITION', 'EXERCISE', 'HEALTH');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  // Create the knowledge_chunks table if it doesn't exist
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      category "KnowledgeCategory" NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      source TEXT,
      embedding vector(768) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('  ✅ Table and extension ready');

  // Ensure table has the vector index
  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
       ON knowledge_chunks
       USING ivfflat (embedding vector_cosine_ops)
       WITH (lists = 10)`,
    );
  } catch {
    // Index creation fails if table is empty (IVFFlat needs data); will retry after seeding
    console.log('  ℹ Vector index will be created after seeding');
  }

  const dataDir = path.join(__dirname, 'data');

  await seedCategory('NUTRITION', path.join(dataDir, 'nutrition-facts.json'));
  await seedCategory('EXERCISE', path.join(dataDir, 'exercise-facts.json'));
  await seedCategory('HEALTH', path.join(dataDir, 'health-guidelines.json'));

  // Create vector index after seeding (IVFFlat needs data)
  try {
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
       ON knowledge_chunks
       USING ivfflat (embedding vector_cosine_ops)
       WITH (lists = 10)`,
    );
    console.log('\n✅ Vector index created successfully');
  } catch (error) {
    console.warn('\n⚠ Could not create IVFFlat index (may need more data):', error);
    // Fallback: use HNSW index which works with any amount of data
    try {
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw_idx
         ON knowledge_chunks
         USING hnsw (embedding vector_cosine_ops)`,
      );
      console.log('✅ HNSW vector index created as fallback');
    } catch {
      console.warn('⚠ Could not create any vector index. Searches will use sequential scan.');
    }
  }

  const count = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    'SELECT COUNT(*) as count FROM knowledge_chunks',
  );
  console.log(`\n🎉 Done! Total knowledge chunks: ${count[0].count}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seeding failed:', e);
  prisma.$disconnect();
  process.exit(1);
});
