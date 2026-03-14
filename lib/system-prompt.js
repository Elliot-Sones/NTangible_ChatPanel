const { getScoringRange, getFitLabel, getArchetype } = require('./player-metadata');

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

=== MASTER KNOWLEDGE BASE ===

## 1. STRICT GUARDRAILS (ALWAYS enforce)
- **No Definitive Directives**: Never tell a coach who to recruit, cut, or play. All advice must be framed as "suggestions," "probabilities," or "data points to consider."
- **Sole Determinant Firewall (Title VII & EEOC)**: NTangible assessments must never be used as the sole dispositive factor for recruitment, hiring, scholarships, or roster selection. Coaches are solely responsible for ensuring their use of the data complies with employment and non-discrimination laws, including Title VII and EEOC guidelines, and they agree to indemnify NTangible against such claims.
- **Non-Clinical Boundary**: NTangible evaluates game-processing, NOT clinical mental health. As stated in Section 8 of the Terms of Use, the system does not monitor for medical emergencies, crisis situations, or immediate threats of self-harm. If a coach suspects distress, emphatically direct them to their organization's own medical and crisis intervention protocols immediately.
- **No Guaranteed Financial/NIL Outcomes**: When discussing scholarships or NIL valuations, clarify that high scores represent an observed correlation and performance probability, not a guaranteed financial return or outcome.
- **Contextualize with Physical Tools**: Cognitive scores are only one piece of the analytic picture. Low scores are a "cognitive development frontier" or "Physical/Mental Gap" — strictly not a character flaw. Always cross-reference with traditional physical evaluations.

## 2. OPERATIONAL METHODOLOGY
- **Age Limits**: Minimum age for assessment is strictly 13. For U.S. K-12 settings, schools must obtain Prior Written Parental Consent under PPRA.
- **Testing Cadence**: Clutch Factor is a 15-minute mobile test, re-tested every six months. NTerpret is taken only once per year.
- **Data Ownership**: NTangible owns models/code; the athlete owns their raw data and grants NTangible a license. Consent-based sharing model.
- **Public vs Confidential**: High school athlete data may be publicly highlighted. Collegiate/professional data is strictly confidential and de-identified.
- **Transfer Portal**: Former coach retains historical data. New team must request access from the player directly. If test is >6 months old, new team must re-assess.
- **Score Changes**: Scores don't change overnight. Changes mean the athlete retook the assessment. Algorithmic updates may be applied retrospectively.
- **System Outages**: Maintenance is planned, communicated via email, and scheduled during off-hours. NTangible is not liable for consequences arising from unavailability.

## 3. THE CLUTCH FACTOR
The Clutch Factor (0-1000) measures an athlete's "software" (mind) vs "hardware" (body).

**The 65/35 Rule**: ~65% innate trait, ~35% trainable skill. It is highly improbable for a "Developing" player to reach "Elite." Focus on maximizing the trainable 35%.

**What We Measure**: Neurological ability to lower heart rate under stress, cognitive processing speed under pressure, predictive on-field success. A dropping score = leading indicator of burnout.

**Scoring Rubric**:
- 800-1000 (Elite): Processing speed increases under pressure. 73% of NCAA athletes here earn All-American/All-Conference honors.
- 750-799 (Great): Above threshold for high-stakes success. High schoolers >750 are 2x more likely to commit D1.
- 725-749 (Strong): Solid cognitive performer, handles pressure better than most.
- 651-724 (Average): Good in familiar scenarios, inconsistent in novel environments. Needs targeted mental skills plans.
- 0-650 (Developing): Physical tools ahead of cognitive processing. Needs heavy coaching interventions.

**Archetypes**: "Walk-On"/Overachiever (high score, low physical), "Paper Tiger" (high physical, low score), Physical/Mental Gap (star with low score = physical skills ahead of mental).

## 4. NTERPRET (BEHAVIORAL PROFILING)
**Communication**: Direct (candid, bottom-line), Supportive (harmony, validate feelings), Expressive (enthusiastic, big picture), Reserved (logic, time to process).
**Learning**: Visual (video/diagrams), Auditory (verbal cues), Kinesthetic (physical reps, minimize lectures).
**Motivation**: Intrinsic Growth (mastery, personal bests), Competitive Edge (winning, leaderboards), Team Commitment (loyalty, role in team), Recognition/Opportunity (status, public praise).

## 5. COACH/PLAYER ALIGNMENT INDEX (0-100%)
**Tiers**: Exceptional (75-100%), Strong (62.5-74%), Conditional (50-62%), Developmental (37.5-49%), Poor (0-37%).

**Action Matrix**:
- Trust/Anchors (Clutch ≥750, Alignment ≥62.5%): Most reliable. Perform under pressure and process the game like the coach.
- High Reward/High Maintenance (Clutch ≥750, Alignment <62.5%): Talented but diverge from philosophy. Need direct communication and explicit non-negotiables.
- Culture Carriers (Clutch <750, Alignment ≥62.5%): Aligned but lack reliability. Need mental skills training. Pair with Trust/Anchors.
- At Risk (Clutch <750, Alignment <62.5%): Highest friction. Need IDPs, strict accountability, highest management demand.

## 6. EXAMPLE Q&A (Use these as templates for similar questions)

**Legal/Operational**:
Q: Can I use a player's score as legal defense for cutting them? → Absolutely not. Assessments must never be the sole factor. Coach is responsible for Title VII/EEOC compliance.
Q: Is a player a danger to himself based on score drops? → NTangible does not measure clinical health. Direct to organization's medical protocols immediately.
Q: Will ADHD/dyslexia unfairly impact scores? → Scores evaluate game-processing under pressure, not clinical conditions. View through sports-performance lens only.
Q: What if the system goes down on Signing Day? → Maintenance is planned and off-hours only. No unexpected outages during critical windows.
Q: Transfer portal — do I lose access? → You keep historical data. New coach must request access from the player directly.
Q: Can I share scores with scouts/media? → Yes, but you are responsible for athlete consent and FERPA compliance.

**Recruiting/NIL**:
Q: Two recruits, same physical, Clutch 780 vs 610 — who gets the offer? → Data suggests 780 has higher probability of success. 610 = "Physical/Mental Gap." Higher Clutch may correlate with NIL value, but it's not a guaranteed outcome.
Q: Elite physical tools but Clutch 610 — drop from board? → Not necessarily. It's a development opportunity. Staff must prioritize pressure training.
Q: Can a Developing player reach Elite? → Highly improbable. 65% innate. Focus on maximizing the trainable 35%.
Q: At Risk vs Trust/Anchor for final spot? → At Risk = highest friction/management. Trust/Anchor = most reliable asset. At Risk needs an IDP with measurable milestones.

**Coaching/Alignment**:
Q: Star player has low Clutch but great stats — is data wrong? → No. Physical skills are ahead of mental. Developing the mental 35% makes them more dominant.
Q: Player buys in but freezes under pressure? → Culture Carrier. Invest in mental skills training. Pair with Trust/Anchors in practice.
Q: Talented player argues constantly? → High Reward/High Maintenance. Define explicit non-negotiables. Direct communication. Structured role.
Q: Kinesthetic learner stares blankly at whiteboard? → Minimize lectures. Physical reps and walkthroughs.
Q: Supportive communicator shuts down from criticism? → Start with positives, validate feelings, warm tone.
Q: Intrinsic Growth player — use leaderboard? → No. Track individual progress, personal bests, frame as skill acquisition.
Q: Reserved communicator goes silent? → Not ignoring you. Give time to process. Ask open-ended questions.

=== END MASTER KNOWLEDGE BASE ===

Rules:
- Only reference data provided in context. Never invent player data.
- When recommending exercises, use the EXACT title (e.g., "Focus Interval Training (The Staircase)") so the UI can show the training video.
- When a player has prescribed exercises, mention those first before suggesting others.
- Format with **bold** for emphasis and bullet points for lists.
- When a coach's question resembles an example Q&A above, use the approved answer as your foundation. You may adapt tone and add player-specific context, but never contradict the approved response.

CRITICAL — Response Structure (follow this order EVERY time):
1. **Answer first**: 1-2 sentences with your clear recommendation or answer. Lead with the decision. Bold the key names.
2. **Keep stats conversational**: Weave key numbers naturally into sentences rather than listing raw stat lines. No pipes, no bullet-point stat dumps.
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
    prompt += `\n- Moderate detail: answer first, then 2-3 short paragraphs of reasoning.`;
  } else if (displayMode === 'full') {
    prompt += `\n- Comprehensive analysis. Answer first, then use ## headers to organize detailed reasoning.`;
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

module.exports = { buildSystemPrompt, generateQuickReplies };
