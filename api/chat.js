const Anthropic = require('@anthropic-ai/sdk');
const { getDb } = require('../lib/db');
const { buildSystemPrompt, generateQuickReplies, generateVisualizations } = require('../lib/system-prompt');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, sessionId, playerContext, displayMode, visiblePlayers, viewContext } = req.body;

  if (!message || !sessionId) {
    return res.status(400).json({ error: 'message and sessionId are required' });
  }

  const sql = getDb();

  try {
    // 1. Full-text search knowledge_chunks — extract keywords and use OR logic for broader matching
    const stopWords = ['the','and','for','how','what','who','why','when','with','this','that','from','are','was','were','have','has','been','can','will','should','about','their','them','they','does','also','into','tell','know','me','you','your','his','her','him','she','keep','keeps','making','player','please','could','would'];
    const words = message
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.includes(w));
    const tsquery = words.length > 0 ? words.join(' | ') : null;

    let chunks = [];
    if (tsquery) {
      chunks = await sql`
        SELECT id, category, subcategory, title, content, metadata,
               ts_rank(tsv, to_tsquery('english', ${tsquery})) AS rank
        FROM knowledge_chunks
        WHERE tsv @@ to_tsquery('english', ${tsquery})
        ORDER BY rank DESC
        LIMIT 5
      `;
    }

    // 2. Fetch last 10 conversation messages for context
    const history = await sql`
      SELECT role, content
      FROM conversations
      WHERE session_id = ${sessionId}
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const conversationHistory = history.reverse();

    // 3. Player lookup — from modal context OR by searching for player names in the message
    let playerData = null;
    let mentionedPlayers = [];

    if (playerContext && playerContext.id) {
      const playerRows = await sql`
        SELECT * FROM players WHERE id = ${playerContext.id} LIMIT 1
      `;
      if (playerRows.length > 0) {
        playerData = playerRows[0];
      }
    }

    // Fall back to frontend-provided player context
    if (!playerData && playerContext) {
      playerData = {
        name: playerContext.name,
        position: playerContext.position,
        level: playerContext.level,
        graduation_year: playerContext.graduationYear,
        clutch_factor: playerContext.clutchFactor,
        fit_score: playerContext.fitScore,
        comm_style: playerContext.commStyle,
        learning_style: playerContext.learningStyle,
        motivation: playerContext.motivation,
        type: playerContext.type,
      };
    }

    // If no player context from modal, try to find player names mentioned in the message
    if (!playerData) {
      const searchTerms = message
        .replace(/[^a-zA-Z\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.includes(w.toLowerCase()));

      if (searchTerms.length > 0) {
        // Search for any player whose name contains any of the search terms
        const namePattern = '%' + searchTerms.join('%') + '%';
        mentionedPlayers = await sql`
          SELECT * FROM players
          WHERE LOWER(name) LIKE LOWER(${namePattern})
          LIMIT 5
        `;

        // If exact multi-word match failed, try individual terms
        if (mentionedPlayers.length === 0) {
          for (const term of searchTerms) {
            if (term.length >= 3 && !stopWords.includes(term.toLowerCase())) {
              const singlePattern = '%' + term + '%';
              const found = await sql`
                SELECT * FROM players
                WHERE LOWER(name) LIKE LOWER(${singlePattern})
                LIMIT 5
              `;
              if (found.length > 0) {
                mentionedPlayers = found;
                break;
              }
            }
          }
        }

        if (mentionedPlayers.length === 1) {
          playerData = mentionedPlayers[0];
        }
      }
    }

    // Fallback: search visiblePlayers from the frontend if DB lookup found nothing
    if (!playerData && mentionedPlayers.length === 0 && Array.isArray(visiblePlayers) && visiblePlayers.length > 0) {
      const searchTerms = message
        .replace(/[^a-zA-Z\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.includes(w.toLowerCase()));

      if (searchTerms.length > 0) {
        // Try full name match first
        const fullQuery = searchTerms.join(' ').toLowerCase();
        const exactMatch = visiblePlayers.find(p =>
          p.name && p.name.toLowerCase().includes(fullQuery)
        );
        if (exactMatch) {
          playerData = {
            name: exactMatch.name,
            position: exactMatch.position,
            level: exactMatch.level,
            graduation_year: exactMatch.graduationYear,
            clutch_factor: exactMatch.clutchFactor,
            fit_score: exactMatch.fitScore,
            comm_style: exactMatch.commStyle,
            learning_style: exactMatch.learningStyle,
            motivation: exactMatch.motivation,
            type: exactMatch.type,
          };
        } else {
          // Try individual term matching
          const matches = visiblePlayers.filter(p => {
            if (!p.name) return false;
            const nameLower = p.name.toLowerCase();
            return searchTerms.some(t => nameLower.includes(t.toLowerCase()));
          });
          if (matches.length === 1) {
            const m = matches[0];
            playerData = {
              name: m.name, position: m.position, level: m.level,
              graduation_year: m.graduationYear, clutch_factor: m.clutchFactor,
              fit_score: m.fitScore, comm_style: m.commStyle,
              learning_style: m.learningStyle, motivation: m.motivation, type: m.type,
            };
          } else if (matches.length > 1) {
            mentionedPlayers = matches.map(m => ({
              name: m.name, position: m.position, level: m.level,
              graduation_year: m.graduationYear, clutch_factor: m.clutchFactor,
              fit_score: m.fitScore, comm_style: m.commStyle,
              learning_style: m.learningStyle, motivation: m.motivation, type: m.type,
            }));
          }
        }
      }
    }

    // 4. Build system prompt
    const systemPrompt = buildSystemPrompt({
      chunks,
      playerData,
      conversationHistory,
      mentionedPlayers,
      displayMode: displayMode || 'compact',
      visiblePlayers: Array.isArray(visiblePlayers) ? visiblePlayers : [],
      viewContext: viewContext || null,
    });

    // 5. Build messages array for Claude
    const messages = [];
    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: 'user', content: message });

    // 6. Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const assistantMessage = response.content[0].text;

    // Generate quick-reply options server-side
    const options = generateQuickReplies({
      playerData,
      mentionedPlayers,
      viewContext,
      chunks,
      assistantMessage,
    });

    // Generate inline visualizations server-side
    const visualizations = generateVisualizations({
      playerData,
      mentionedPlayers,
      visiblePlayers: Array.isArray(visiblePlayers) ? visiblePlayers : [],
      viewContext,
      assistantMessage,
      userMessage: message,
    });

    // 7. Store user + assistant messages in conversations
    const chunksUsedIds = chunks.map(c => c.id);
    await sql`
      INSERT INTO conversations (session_id, role, content, metadata)
      VALUES (${sessionId}, 'user', ${message}, ${JSON.stringify({ playerContext: playerContext?.id || null })})
    `;
    await sql`
      INSERT INTO conversations (session_id, role, content, metadata)
      VALUES (${sessionId}, 'assistant', ${assistantMessage}, ${JSON.stringify({ chunksUsed: chunksUsedIds })})
    `;

    // 8. Extract YouTube URLs from matched chunks — only include if the response actually mentions the exercise
    const videos = chunks
      .filter(c => {
        if (!c.metadata || !c.metadata.youtubeUrl) return false;
        // Only include video if the assistant response references the exercise title
        const titleWords = c.title.split(/[\s()]+/).filter(w => w.length > 3);
        return titleWords.some(w => assistantMessage.toLowerCase().includes(w.toLowerCase()));
      })
      .map(c => ({
        title: c.title,
        url: c.metadata.youtubeUrl,
        exerciseId: c.metadata.exerciseId,
      }));

    // 9. Return response
    return res.status(200).json({
      message: assistantMessage,
      videos,
      options,
      visualizations,
      chunksUsed: chunks.map(c => ({ id: c.id, title: c.title, category: c.category })),
    });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: error.message });
  }
};
