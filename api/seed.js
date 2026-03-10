const { getDb } = require('../lib/db');
const { knowledgeChunks } = require('../lib/knowledge-chunks');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers['x-seed-token'];
  if (token !== process.env.SEED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sql = getDb();

  try {
    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS knowledge_chunks (
        id            SERIAL PRIMARY KEY,
        category      TEXT NOT NULL,
        subcategory   TEXT,
        title         TEXT NOT NULL,
        content       TEXT NOT NULL,
        metadata      JSONB DEFAULT '{}',
        tsv           tsvector GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || content)) STORED,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_kc_tsv ON knowledge_chunks USING gin(tsv)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_kc_category ON knowledge_chunks (category)`;

    await sql`
      CREATE TABLE IF NOT EXISTS players (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        position        TEXT,
        level           TEXT,
        graduation_year INT,
        clutch_factor   INT,
        fit_score       INT,
        comm_style      TEXT,
        learning_style  TEXT,
        motivation      TEXT,
        type            TEXT,
        round           TEXT,
        metadata        JSONB DEFAULT '{}',
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id            SERIAL PRIMARY KEY,
        session_id    TEXT NOT NULL,
        role          TEXT NOT NULL,
        content       TEXT NOT NULL,
        metadata      JSONB DEFAULT '{}',
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_conv_session ON conversations (session_id, created_at)`;

    await sql`
      CREATE TABLE IF NOT EXISTS team_notes (
        id            SERIAL PRIMARY KEY,
        session_id    TEXT NOT NULL,
        player_name   TEXT,
        note          TEXT NOT NULL,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Truncate and re-seed knowledge chunks
    await sql`TRUNCATE knowledge_chunks RESTART IDENTITY`;

    for (const chunk of knowledgeChunks) {
      await sql`
        INSERT INTO knowledge_chunks (category, subcategory, title, content, metadata)
        VALUES (${chunk.category}, ${chunk.subcategory || null}, ${chunk.title}, ${chunk.content}, ${JSON.stringify(chunk.metadata || {})})
      `;
    }

    return res.status(200).json({
      success: true,
      chunksInserted: knowledgeChunks.length
    });
  } catch (error) {
    console.error('Seed error:', error);
    return res.status(500).json({ error: error.message });
  }
};
