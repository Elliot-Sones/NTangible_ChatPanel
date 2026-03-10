const { getScoringRange, getFitLabel, getArchetype, getPsychometricDimensions } = require('./player-metadata');

/**
 * Builds the system prompt for the NTangible Coaching Assistant.
 * Kept minimal — domain knowledge comes from RAG, not hardcoded here.
 */

function formatPlayerFull(p) {
  const ext = (p.metadata && p.metadata.extended) || {};
  const isHighFit = (p.fit_score || 0) >= 62.5;
  const isHighClutch = (p.clutch_factor || 0) >= 750;
  let archetype = 'At Risk';
  if (isHighFit && isHighClutch) archetype = 'Trust / Anchors';
  else if (!isHighFit && isHighClutch) archetype = 'High Reward / High Maintenance';
  else if (isHighFit && !isHighClutch) archetype = 'Culture Carriers';

  let line = '';
  line += `- Position: ${p.position || 'N/A'}, Level: ${p.level || 'N/A'}, Type: ${p.type || 'N/A'}\n`;
  line += `- Clutch Factor: ${p.clutch_factor || 'N/A'}, Scoring Tier: ${ext.scoring_range || 'N/A'}, Fit Score: ${p.fit_score || 'N/A'}% (${ext.fit_label || 'N/A'})\n`;
  line += `- Cohort: ${ext.archetype_category || archetype}, Action: ${ext.archetype_action || 'N/A'}\n`;
  line += `- Communication: ${p.comm_style || 'N/A'}, Learning: ${p.learning_style || 'N/A'}, Motivation: ${p.motivation || 'N/A'}\n`;
  line += `- Graduation Year: ${p.graduation_year || 'N/A'}\n`;

  if (ext.overall_rank) {
    line += `- Rankings: Overall #${ext.overall_rank}/${ext.overall_total}`;
    if (ext.positional_rank) line += ` | Positional #${ext.positional_rank}/${ext.positional_total}`;
    if (ext.round_rank) line += ` | Round #${ext.round_rank}/${ext.round_total}`;
    line += '\n';
  }

  if (ext.prescribed_exercises && ext.prescribed_exercises.length > 0) {
    line += `- Prescribed Exercises: ${ext.prescribed_exercises.map(e => `"${e.title}"`).join(', ')}\n`;
  }

  if (ext.nterpret) {
    const nt = ext.nterpret;
    if (nt.communication) {
      line += `- Communication Profile (${nt.communication.type}): ${nt.communication.description}\n`;
      line += `  Coaching Strategy: ${nt.communication.strategy}\n`;
    }
    if (nt.learning) {
      line += `- Learning Profile (${nt.learning.type}): ${nt.learning.description}\n`;
      line += `  Coaching Strategy: ${nt.learning.strategy}\n`;
    }
    if (nt.motivation) {
      line += `- Motivation Profile (${nt.motivation.type}): ${nt.motivation.description}\n`;
      line += `  Coaching Strategy: ${nt.motivation.strategy}\n`;
    }
  }

  if (ext.fit_description) {
    line += `- Alignment Insight: ${ext.fit_description}\n`;
  }

  if (ext.psychometric_dimensions && ext.psychometric_dimensions.length > 0) {
    line += '- Psychometric Dimensions: ';
    line += ext.psychometric_dimensions.map(d => `${d.domain}=${d.alignment}`).join(', ');
    line += '\n';
  }

  return line;
}

function formatPlayerCompact(p) {
  const ext = (p.metadata && p.metadata.extended) || {};
  let line = '';
  line += `- ${p.position || 'N/A'}, ${p.level || 'N/A'}, ${p.type || 'N/A'}\n`;
  line += `- Clutch ${p.clutch_factor || 'N/A'} (${ext.scoring_range || 'N/A'}), Fit ${p.fit_score || 'N/A'}% (${ext.fit_label || 'N/A'}), ${ext.archetype_category || 'N/A'}\n`;
  line += `- ${p.comm_style || 'N/A'} communicator, ${p.learning_style || 'N/A'} learner, ${p.motivation || 'N/A'} motivation\n`;
  return line;
}

function buildSystemPrompt({ chunks = [], playerData = null, conversationHistory = [], mentionedPlayers = [], displayMode = 'compact', visiblePlayers = [], viewContext = null }) {
  let prompt = `You are the NTangible Coaching Assistant. You help baseball coaches understand their players and make better coaching decisions.

Use the retrieved context below to answer questions. Be direct and actionable — coaches want practical strategies, not theory.

Rules:
- Only reference data provided in context. Never invent player data.
- When recommending exercises, use the EXACT title (e.g., "Focus Interval Training (The Staircase)") so the UI can show the training video.
- When a player has prescribed exercises, mention those first before suggesting others.
- Format with **bold** for emphasis and bullet points for lists.

CRITICAL — Response Structure (follow this order EVERY time):
1. **Answer first**: 1-2 sentences with your clear recommendation or answer. Lead with the decision. Bold the key names.
2. **No data tables in text**: NEVER format stats, numbers, or comparisons as text. The UI automatically generates a data table alongside your response when players are compared. Do NOT create your own tables, stat lines, or bullet-point stat lists. No pipes, no "Clutch 949, Fit 76%" lines.
3. **Explanation after**: If needed, add 1-2 sentences of reasoning, coaching strategy, or next steps AFTER the answer.

BAD example (never do this):
- Robinson, Aiden - Clutch 949, Fit 76% | ROSTER | Elite performer
- Rodriguez, Liam - Clutch 853, Fit 27% | ROSTER | High talent

GOOD example:
**Robinson** is your clear starter — elite performance with solid culture fit. **Ramirez** is your ideal backup — reliable and won't disrupt chemistry.

Consider **Adversity Simulation** training for Rodriguez to help with culture issues.`;

  // Response length based on display mode
  if (displayMode === 'compact') {
    prompt += `\n- Keep it tight: answer in 1-2 sentences, then 1-2 sentences of context max. No bullet-point stat lists.`;
  } else if (displayMode === 'half') {
    prompt += `\n- Moderate detail: answer first, then 2-3 short paragraphs of reasoning. Still no stat tables in text.`;
  } else if (displayMode === 'full') {
    prompt += `\n- Comprehensive analysis. Answer first, then use ## headers to organize detailed reasoning. Still no stat tables in text — the UI handles data display.`;
  }

  // View context — what the coach is looking at
  if (viewContext) {
    prompt += `\n\nThe coach is currently on: **${viewContext.viewLabel || viewContext.view}**`;
    if (viewContext.selectedPlayer) {
      prompt += ` — viewing **${viewContext.selectedPlayer.name}**'s profile`;
      if (viewContext.modalTab) prompt += ` (${viewContext.modalTab} tab)`;
    }
    if (viewContext.filters) {
      const active = Object.entries(viewContext.filters)
        .filter(([k, v]) => v && v !== 'All')
        .map(([k, v]) => `${k}: ${v}`);
      if (active.length > 0) prompt += `\nFilters: ${active.join(', ')}`;
    }
    prompt += `\nAssume vague questions relate to what's on their screen.`;
  }

  // Retrieved knowledge chunks
  if (chunks.length > 0) {
    prompt += '\n\n## Retrieved Context\n';
    chunks.forEach(chunk => {
      prompt += `### ${chunk.title}\n${chunk.content}\n\n`;
    });
  }

  // Player data
  if (playerData) {
    prompt += '\n\n## Player Data\n';
    prompt += `**${playerData.name}**:\n`;
    prompt += formatPlayerFull(playerData);
  }

  // Multiple mentioned players
  if (!playerData && mentionedPlayers && mentionedPlayers.length > 0) {
    prompt += '\n\n## Matched Players\n';
    if (mentionedPlayers.length === 1) {
      const p = mentionedPlayers[0];
      prompt += `**${p.name}**:\n`;
      prompt += formatPlayerFull(p);
    } else {
      prompt += `Multiple players matched. List them and ask which one:\n\n`;
      mentionedPlayers.forEach(p => {
        prompt += `**${p.name}**:\n`;
        prompt += formatPlayerCompact(p);
        prompt += '\n';
      });
    }
  }

  // Visible roster
  if (visiblePlayers && visiblePlayers.length > 0 && !playerData) {
    prompt += '\n\n## Roster on Screen\n';
    visiblePlayers.forEach(p => {
      prompt += `- **${p.name}**: ${p.position || '?'}, Clutch ${p.clutchFactor || '?'}, Fit ${p.fitScore || '?'}%, ${p.type || ''}\n`;
    });
  }

  return prompt;
}

/**
 * Generate quick-reply options server-side based on response context.
 * No AI involvement — deterministic and reliable.
 */
function generateQuickReplies({ playerData, mentionedPlayers, viewContext, chunks, assistantMessage }) {
  const options = [];
  const msgLower = (assistantMessage || '').toLowerCase();

  // Player-specific follow-ups
  if (playerData) {
    const name = playerData.name;
    if (!msgLower.includes('exercise') && !msgLower.includes('training')) {
      options.push(`What exercises should I prescribe for ${name}?`);
    }
    if (!msgLower.includes('communication') && !msgLower.includes('nterpret')) {
      options.push(`How should I communicate with ${name}?`);
    }
    if (!msgLower.includes('alignment') && !msgLower.includes('fit')) {
      options.push(`How aligned is ${name} with my coaching style?`);
    }
    options.push(`Compare ${name} to similar players on my roster`);
  }

  // Multiple player matches — only offer disambiguation if truly ambiguous
  if (!playerData && mentionedPlayers && mentionedPlayers.length > 1 && mentionedPlayers.length <= 4) {
    // Only show "Tell me about" options if the assistant response indicates ambiguity
    if (msgLower.includes('which') || msgLower.includes('multiple') || msgLower.includes('did you mean')) {
      mentionedPlayers.slice(0, 4).forEach(p => {
        options.push(`Tell me about ${p.name}`);
      });
      return options;
    }
  }

  // Exercise follow-ups
  if (chunks && chunks.some(c => c.category === 'exercise')) {
    if (!msgLower.includes('protocol')) {
      options.push('Show me the full exercise protocol');
    }
    if (!playerData) {
      options.push('Which players need this exercise most?');
    }
  }

  // View-specific suggestions (only if no player context)
  if (!playerData && viewContext) {
    if (viewContext.view === 'home' && options.length < 3) {
      options.push('Who are my top performers right now?');
    }
    if (viewContext.view === 'alignment' && options.length < 3) {
      options.push('Which players have low alignment I should address?');
    }
    if (viewContext.view === 'training' && options.length < 3) {
      options.push('What exercises should I prioritize this week?');
    }
    if (viewContext.view === 'recruiting' && options.length < 3) {
      options.push('How should I evaluate this recruit?');
    }
  }

  return options.slice(0, 4);
}

// ── Visualization helpers ──

function abbreviateName(name) {
  const parts = (name || '').split(',');
  if (parts.length < 2) return name || '';
  return parts[0].trim() + ', ' + parts[1].trim().charAt(0) + '.';
}

function findPlayerHistory(player, visiblePlayers) {
  if (player.metadata && player.metadata.history) return player.metadata.history;
  if (player.history) return player.history;
  if (Array.isArray(visiblePlayers)) {
    const match = visiblePlayers.find(vp =>
      (vp.id && vp.id === player.id) ||
      (vp.name && player.name && vp.name.toLowerCase() === player.name.toLowerCase())
    );
    if (match && match.history) return match.history;
  }
  return null;
}

function getPlayerPsychometrics(player) {
  const ext = (player.metadata && player.metadata.extended) || {};
  if (ext.psychometric_dimensions && ext.psychometric_dimensions.length > 0) {
    return ext.psychometric_dimensions;
  }
  return getPsychometricDimensions(player);
}

function buildPlayerVizData(p, visiblePlayers) {
  const clutch = p.clutch_factor || p.clutchFactor || 0;
  const fit = p.fit_score || p.fitScore || 0;
  const history = findPlayerHistory(p, visiblePlayers);
  return {
    name: p.name,
    position: p.position || 'N/A',
    clutchFactor: clutch,
    fitScore: fit,
    commStyle: p.comm_style || p.commStyle || 'N/A',
    learningStyle: p.learning_style || p.learningStyle || 'N/A',
    motivation: p.motivation || 'N/A',
    type: p.type || 'N/A',
    history: history,
    scoringRange: getScoringRange(clutch),
    fitLabel: getFitLabel(fit),
    archetype: getArchetype(fit, clutch).category,
  };
}

/**
 * Generate inline visualizations server-side based on response context.
 * Same deterministic pattern as generateQuickReplies.
 */
function generateVisualizations({ playerData, mentionedPlayers, visiblePlayers, viewContext, assistantMessage, userMessage }) {
  const visualizations = [];
  const msgLower = (assistantMessage || '').toLowerCase();
  const userLower = (userMessage || '').toLowerCase();

  // 1. Comparison Table — only when user explicitly wants to compare players
  const compareKeywords = ['compare', 'comparison', 'head-to-head', 'vs', 'versus', 'options', 'between'];
  const wantsCompare = compareKeywords.some(k => userLower.includes(k));
  const tablePlayerCount = mentionedPlayers ? mentionedPlayers.length : 0;
  if (mentionedPlayers && tablePlayerCount >= 2 && wantsCompare) {
    const tablePlayers = mentionedPlayers.slice(0, 6).map(p => buildPlayerVizData(p, visiblePlayers));
    // Compute insight
    let insight = '';
    if (tablePlayers.length >= 2) {
      const clutchDiff = Math.abs((tablePlayers[0].clutchFactor || 0) - (tablePlayers[1].clutchFactor || 0));
      const fitDiff = Math.abs((tablePlayers[0].fitScore || 0) - (tablePlayers[1].fitScore || 0));
      if (fitDiff > 20) {
        const better = tablePlayers[0].fitScore > tablePlayers[1].fitScore ? tablePlayers[0] : tablePlayers[1];
        const other = better === tablePlayers[0] ? tablePlayers[1] : tablePlayers[0];
        insight = abbreviateName(better.name) + ' is a significantly better culture fit (' + better.fitScore + '% vs ' + other.fitScore + '%)';
      } else if (clutchDiff > 50) {
        const better = tablePlayers[0].clutchFactor > tablePlayers[1].clutchFactor ? tablePlayers[0] : tablePlayers[1];
        const other = better === tablePlayers[0] ? tablePlayers[1] : tablePlayers[0];
        insight = abbreviateName(better.name) + ' has a clear performance edge (Clutch ' + better.clutchFactor + ' vs ' + other.clutchFactor + ')';
      } else {
        insight = 'Very similar profiles \u2014 differentiate on communication style and team role fit';
      }
    }
    visualizations.push({
      type: 'table',
      title: 'Head-to-Head Comparison',
      data: {
        players: tablePlayers,
        highlightMetric: 'clutchFactor',
        insight: insight,
      }
    });
  }

  // 2. Bar Chart — ranking keywords in USER message, no single-player focus, 3+ visible
  const barKeywords = ['top', 'highest', 'lowest', 'rank', 'distribution', 'best', 'worst', 'leaderboard', 'performers'];
  const wantsBar = barKeywords.some(k => userLower.includes(k));
  if (wantsBar && Array.isArray(visiblePlayers) && visiblePlayers.length >= 3 && !playerData) {
    const metric = userLower.includes('fit') || userLower.includes('alignment') ? 'fitScore' : 'clutchFactor';
    const metricLabel = metric === 'fitScore' ? 'Fit Score' : 'Clutch Factor';
    const isBottom = userLower.includes('lowest') || userLower.includes('worst') || userLower.includes('bottom');
    const sorted = [...visiblePlayers].sort((a, b) => isBottom ? ((a[metric] || 0) - (b[metric] || 0)) : ((b[metric] || 0) - (a[metric] || 0)));
    const items = sorted.slice(0, 10).map(p => ({
      label: abbreviateName(p.name),
      fullName: p.name,
      value: p[metric] || 0,
      tier: metric === 'clutchFactor' ? getScoringRange(p[metric] || 0) : getFitLabel(p[metric] || 0),
    }));
    visualizations.push({
      type: 'bar',
      title: `${isBottom ? 'Bottom' : 'Top'} ${items.length} — ${metricLabel}`,
      data: { metric, metricLabel, items, maxValue: metric === 'clutchFactor' ? 1000 : 100 }
    });
  }

  // 3. Radar Chart — single player + psychometric keywords
  const radarKeywords = ['psychometric', 'dimensions', 'profile', 'alignment breakdown', 'radar', 'spider'];
  const wantsRadar = radarKeywords.some(k => msgLower.includes(k));
  if (wantsRadar && playerData) {
    const dims = getPlayerPsychometrics(playerData);
    if (dims && dims.length > 0) {
      visualizations.push({
        type: 'radar',
        title: `${playerData.name} — Psychometric Profile`,
        data: {
          playerName: playerData.name,
          dimensions: dims.map(d => ({
            label: d.domain,
            value: d.alignment === 'High' ? 85 : d.alignment === 'Moderate' ? 55 : 25,
          }))
        }
      });
    }
  }

  // 4. Trend Line — single player + trend keywords + history data
  const trendKeywords = ['trend', 'history', 'progress', 'improved', 'declined', 'over time', 'trajectory', 'getting better', 'getting worse'];
  const wantsTrend = trendKeywords.some(k => msgLower.includes(k));
  if (wantsTrend && playerData) {
    const history = findPlayerHistory(playerData, visiblePlayers);
    if (history && history.length >= 2) {
      visualizations.push({
        type: 'trend',
        title: `${playerData.name} — Clutch Factor Trend`,
        data: {
          playerName: playerData.name,
          points: history,
          labels: history.map((_, i) => i === history.length - 1 ? 'Current' : `Test ${i + 1}`),
          metric: 'Clutch Factor'
        }
      });
    }
  }

  return visualizations;
}

module.exports = { buildSystemPrompt, generateQuickReplies, generateVisualizations };
