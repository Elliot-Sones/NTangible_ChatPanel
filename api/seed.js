const { getDb } = require('../lib/db');
const { knowledgeChunks } = require('../lib/knowledge-chunks');
const { embedTexts } = require('../lib/embeddings');

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
    // Enable pgvector extension
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;

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
        embedding     VECTOR(1024),
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Add embedding column if migrating from an existing table
    await sql`
      DO $$ BEGIN
        ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS embedding VECTOR(1024);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_kc_tsv ON knowledge_chunks USING gin(tsv)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_kc_category ON knowledge_chunks (category)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_kc_embedding ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)`;

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
        commitment_label TEXT DEFAULT 'Uncommitted',
        metadata        JSONB DEFAULT '{}',
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Add commitment_label column if migrating from an existing table
    await sql`
      DO $$ BEGIN
        ALTER TABLE players ADD COLUMN IF NOT EXISTS commitment_label TEXT DEFAULT 'Uncommitted';
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$
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

    // === STATISTICIAN AGENT TABLES ===

    await sql`
      CREATE TABLE IF NOT EXISTS game_logs (
        id              SERIAL PRIMARY KEY,
        player_id       TEXT NOT NULL REFERENCES players(id),
        game_date       DATE NOT NULL,
        opponent        TEXT,
        home_away       TEXT,
        team_score      INT,
        opponent_score  INT,
        result          TEXT,
        is_close_game   BOOLEAN DEFAULT false,
        is_conference   BOOLEAN DEFAULT false,
        is_tournament   BOOLEAN DEFAULT false,
        at_bats         INT DEFAULT 0,
        hits            INT DEFAULT 0,
        rbis            INT DEFAULT 0,
        errors          INT DEFAULT 0,
        strikeouts      INT DEFAULT 0,
        walks           INT DEFAULT 0,
        coach_note      TEXT,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_gl_player_date ON game_logs (player_id, game_date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_gl_date ON game_logs (game_date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_gl_close ON game_logs (is_close_game)`;

    await sql`
      CREATE TABLE IF NOT EXISTS recruiting_outcomes (
        id              SERIAL PRIMARY KEY,
        player_id       TEXT NOT NULL REFERENCES players(id),
        signing_date    DATE,
        playing_time_yr1 TEXT,
        playing_time_yr2 TEXT,
        still_on_team   BOOLEAN DEFAULT true,
        entered_portal  BOOLEAN DEFAULT false,
        portal_date     DATE,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_ro_player ON recruiting_outcomes (player_id)`;

    await sql`
      CREATE TABLE IF NOT EXISTS stat_findings (
        id                  SERIAL PRIMARY KEY,
        finding_type        TEXT NOT NULL,
        title               TEXT NOT NULL,
        summary             TEXT,
        methodology         TEXT,
        sql_query           TEXT,
        result_data         JSONB DEFAULT '{}',
        data_points         INT DEFAULT 0,
        confidence          INT DEFAULT 0,
        confidence_label    TEXT DEFAULT 'Low',
        effect_size         FLOAT,
        p_value             FLOAT,
        confidence_interval JSONB,
        is_significant      BOOLEAN DEFAULT false,
        trend               TEXT DEFAULT 'new',
        coach_feedback      TEXT,
        computed_at         TIMESTAMPTZ DEFAULT NOW(),
        superseded_by       INT,
        analysis_run_id     INT
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_sf_type ON stat_findings (finding_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sf_current ON stat_findings (superseded_by) WHERE superseded_by IS NULL`;

    await sql`
      CREATE TABLE IF NOT EXISTS analysis_runs (
        id                  SERIAL PRIMARY KEY,
        trigger             TEXT NOT NULL,
        started_at          TIMESTAMPTZ DEFAULT NOW(),
        completed_at        TIMESTAMPTZ,
        games_analyzed      INT DEFAULT 0,
        findings_generated  INT DEFAULT 0,
        findings_changed    INT DEFAULT 0,
        status              TEXT DEFAULT 'running'
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

    // Batch-embed all chunks via Voyage AI and update the embedding column
    const textsToEmbed = knowledgeChunks.map(c => `${c.title}\n${c.content}`);

    // Voyage API supports up to 128 texts per call; batch in groups of 100
    const BATCH_SIZE = 100;
    const allEmbeddings = [];
    for (let i = 0; i < textsToEmbed.length; i += BATCH_SIZE) {
      const batch = textsToEmbed.slice(i, i + BATCH_SIZE);
      const batchEmbeddings = await embedTexts(batch, 'document');
      allEmbeddings.push(...batchEmbeddings);
    }

    // Update each chunk with its embedding
    for (let i = 0; i < allEmbeddings.length; i++) {
      const vecString = `[${allEmbeddings[i].join(',')}]`;
      await sql`
        UPDATE knowledge_chunks
        SET embedding = ${vecString}::vector
        WHERE id = ${i + 1}
      `;
    }

    return res.status(200).json({
      success: true,
      chunksInserted: knowledgeChunks.length,
      chunksEmbedded: allEmbeddings.length,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return res.status(500).json({ error: error.message });
  }
};
