const knowledgeChunks = [
  // ===== EXERCISES (14 chunks) =====
  {
    category: 'exercise',
    subcategory: 'Focus',
    title: 'Focus Interval Training (The Staircase)',
    content: `PURPOSE: Build sustained mental focus under pressure.
WHO NEEDS THIS: Players who lose concentration during long at-bats, late innings, or extended defensive sequences. Especially effective for Developmental clutch tier (400-549) players who need to build baseline focus.
FULL PROTOCOL: Set a timer for 30 seconds and lock your eyes on a tiny visual anchor, like a scratch on your equipment. If your mind drifts even for a split second, stop, reset, and start again. If you can hold that laser focus for 30 seconds, push it to 45. This 'staircase' method builds the mental endurance required to stay locked in deep into overtime, so you never drift when the game is on the line.
COACH INSIGHT: Start with a static object (like a logo on a bat). Once mastered, graduate to a moving object (like a ceiling fan blade or a partner moving a ball) to simulate tracking without breaking cognitive lock.
BEST FOR: Culture Carriers and At Risk cohorts who need to develop mental consistency. Players with Kinesthetic learning style benefit from the physical anchor point.`,
    metadata: { youtubeUrl: 'https://youtu.be/QliFmb9QFbA', exerciseId: 1 }
  },
  {
    category: 'exercise',
    subcategory: 'Focus',
    title: 'Distraction Control (The Gating Drill)',
    content: `PURPOSE: Build mental armor against environmental distractions.
WHO NEEDS THIS: Players who underperform in hostile away environments, loud stadiums, or high-pressure postseason games. Critical for High Reward / High Maintenance players who have the talent but lose composure.
FULL PROTOCOL: Perform your standard physical rep while a partner tries to break your concentration—waving towels or making noise. Your job isn't to fight the distraction, but to acknowledge it and execute right through it. Focus strictly on the tactile feel of the movement. This drills the mental armor you need to walk into a hostile stadium and execute with surgical precision.
COACH INSIGHT: This trains 'Selective Attention'. Your brain learns to categorize crowd noise as 'background static' rather than 'threat', lowering cortisol spikes during away games.
BEST FOR: High Performer (700-849) and Elite (850+) players who need to maintain their edge in hostile environments. Expressive communicators who are sensitive to environmental stimuli.`,
    metadata: { youtubeUrl: 'https://youtu.be/MnfsxL0yqmU', exerciseId: 2 }
  },
  {
    category: 'exercise',
    subcategory: 'Focus',
    title: 'Wide-to-Narrow Toggles',
    content: `PURPOSE: Prevent tunnel vision under pressure and improve visual processing speed.
WHO NEEDS THIS: Players who get tunnel vision in clutch moments, miss defensive reads, or struggle with situational awareness. Essential for position players who need to read the field.
FULL PROTOCOL: Stand in your competition stance and practice shifting gears. First, go 'Wide': see the whole field peripherally for 3 seconds. Then, go 'Narrow': snap your focus instantly to a micro-target for 3 seconds. Repeat this 5 times. This trains your brain to process information faster than the game speed, preventing panic and keeping you one step ahead.
COACH INSIGHT: Use this between pitches. Go 'Wide' to scan the defense, then snap 'Narrow' to the pitcher's release point. It prevents eye fatigue and keeps your visual processing speed elite.
BEST FOR: Visual learners especially benefit. Players in the Solid tier (550-699) looking to break into High Performer territory. Trust/Anchors who want to elevate their game awareness.`,
    metadata: { youtubeUrl: 'https://youtu.be/ZFSYk8qHxec', exerciseId: 3 }
  },
  {
    category: 'exercise',
    subcategory: 'Breathing',
    title: 'Box Breathing Reset (4-4-4-4)',
    content: `PURPOSE: Provide a mechanical override switch for the nervous system to clear tension instantly.
WHO NEEDS THIS: Every player, but especially those who rush decisions under pressure, show visible tension (tight shoulders, clenched jaw), or have elevated heart rates in clutch moments.
FULL PROTOCOL: Inhale through your nose for 4 seconds, hold for 4, exhale for 4, and hold empty for 4. This isn't just relaxation; it is a mechanical override switch for your nervous system. It clears the physical tension instantly so you can make a cold, calculated decision while everyone else is rushing.
COACH INSIGHT: The 'Hold Empty' phase is critical—it increases CO2 tolerance, which calms the amygdala (fear center). Use this specifically after a bad call or error.
BEST FOR: Universal tool for all cohorts. Particularly valuable for Competitive Edge motivated players who tend to over-activate. Direct communicators can adopt this quickly due to its structured nature.`,
    metadata: { youtubeUrl: 'https://youtu.be/MDEsW3yE-K8', exerciseId: 4 }
  },
  {
    category: 'exercise',
    subcategory: 'Recovery',
    title: 'Cognitive Cooldown Walk',
    content: `PURPOSE: Down-shift the brain from combat mode post-game to enable full recovery.
WHO NEEDS THIS: Players who can't "turn off" after games, have trouble sleeping post-competition, or carry emotional residue into the next day. Common in Competitive Edge motivated players.
FULL PROTOCOL: Immediately post-game, before checking your phone, take a 5-minute walk alone. Look around and simply name what you see—'blue chair,' 'green grass'—without judgment. We call this 'down-shifting.' It pulls your brain out of combat mode so you can recharge your battery completely for the next battle.
COACH INSIGHT: This prevents 'Competition Hangover'. By manually switching off your fight-or-flight response, you improve sleep quality and recovery speed for the next day's game.
BEST FOR: High Performer and Elite tier players who compete intensely. Intrinsic Growth motivated players who tend to over-analyze. Reserved communicators who internalize game stress.`,
    metadata: { youtubeUrl: 'https://youtu.be/FHwbZwAaLKk', exerciseId: 5 }
  },
  {
    category: 'exercise',
    subcategory: 'Body Awareness',
    title: 'Body Scan Check',
    content: `PURPOSE: Detect and release hidden tension that sabotages mechanics.
WHO NEEDS THIS: Players whose mechanics break down under pressure, who carry stress physically, or who have unexplained performance dips. Especially useful pre-game.
FULL PROTOCOL: Lay flat and scan your body from toes to head. Tense a muscle group hard for 5 seconds, then let it go completely. Feel the difference between 'locked' and 'loose.' This trains your awareness so you can detect tightness in your shoulders or hands mid-game and release it instantly, keeping your movement fluid and explosive.
COACH INSIGHT: Most errors come from 'guarding' (unconscious tension). Doing this pre-game helps you identify which muscle groups are carrying stress today so you can stretch them specifically.
BEST FOR: Kinesthetic learners who respond to physical awareness. Culture Carriers who may carry team stress physically. Developmental clutch tier players building self-awareness.`,
    metadata: { youtubeUrl: 'https://youtu.be/yNTzdDLGv-U', exerciseId: 6 }
  },
  {
    category: 'exercise',
    subcategory: 'Resilience',
    title: 'Post-Error Reset (The Flush)',
    content: `PURPOSE: Immediately clear the mental impact of errors so the next play is unaffected.
WHO NEEDS THIS: Players who compound errors (one mistake leads to two or three), who visibly deflate after mistakes, or whose body language changes negatively. Critical for At Risk cohort.
FULL PROTOCOL: Pick a physical trigger—like unstrapping a glove. The moment an error happens, hit that trigger, take a breath, and say 'Flush.' That physical action deletes the error from your RAM. It allows you to step into the next play with zero baggage, ready to make an impact.
COACH INSIGHT: The physical anchor is key. You are conditioning a Pavlovian response: Physical Action = Emotional Reset. Over time, the motion alone will lower your heart rate.
BEST FOR: All cohorts, but essential for At Risk and High Reward / High Maintenance players. Supportive communicators who internalize failure. Players in Developmental and Low clutch tiers who are prone to compounding errors.`,
    metadata: { youtubeUrl: 'https://youtu.be/bMzY1OILR-k', exerciseId: 7 }
  },
  {
    category: 'exercise',
    subcategory: 'Resilience',
    title: 'Bounce-Back Planning (If-Then)',
    content: `PURPOSE: Replace emotional reactions with pre-programmed protocols.
WHO NEEDS THIS: Players who react emotionally to adversity instead of executing calmly. Players who freeze, panic, or lose composure when things go wrong.
FULL PROTOCOL: Script your response now. Write down: 'IF I make a mistake, THEN I will look at a specific spot, take a breath, and reset.' When adversity hits, you don't have to think or feel; you just execute the protocol. This keeps you in control and dangerous even when things go wrong.
COACH INSIGHT: This outsources decision making. Under stress, your frontal cortex (logic) shuts down. Having a pre-loaded script bypasses the need for logic and relies on automatic execution.
BEST FOR: Reserved and Direct communicators who prefer structured approaches. Developmental tier players who need concrete tools. Auditory learners who benefit from verbal scripting.`,
    metadata: { youtubeUrl: 'https://youtu.be/rIYKDBFWUxE', exerciseId: 8 }
  },
  {
    category: 'exercise',
    subcategory: 'Resilience',
    title: 'Adversity Simulation (Worst Case)',
    content: `PURPOSE: Inoculate players against pressure by normalizing high-stress scenarios in practice.
WHO NEEDS THIS: Players whose performance drops significantly in high-stakes situations. Players who practice well but underperform in games. Critical for players with large Physical/Mental gaps.
FULL PROTOCOL: Start a practice drill with a massive disadvantage—down on the scoreboard with seconds left. Your goal isn't just to win, but to keep your body language dominant. We call this 'inoculation.' By living in the fire during practice, the pressure of a real game will feel slow, familiar, and manageable.
COACH INSIGHT: The goal is 'Desensitization'. If you normalize panic in practice, your brain won't spike adrenaline during the game, allowing you to maintain fine motor control.
BEST FOR: Competitive Edge motivated players thrive in these scenarios. High Reward / High Maintenance players who need to prove they can handle pressure. Players in Solid tier (550-699) looking to break through to High Performer.`,
    metadata: { youtubeUrl: 'https://youtu.be/hx6QV34DJhI', exerciseId: 9 }
  },
  {
    category: 'exercise',
    subcategory: 'Confidence',
    title: 'Success Memory Bank (Highlight Reel)',
    content: `PURPOSE: Overwrite doubt with evidence of past success to build lasting confidence.
WHO NEEDS THIS: Players with confidence issues, impostor syndrome, or negative self-talk patterns. Players coming back from injury or a slump.
FULL PROTOCOL: Every night, write down three winning moments from your day—even small ones. Visualize them in 4K detail before sleep. This builds a 'Highlight Reel' in your subconscious that crowds out fear and reminds you that you are built for this level.
COACH INSIGHT: Do this right before sleep. Your brain consolidates memory during REM cycles. Programming success visuals pre-sleep physically rewires neural pathways for confidence.
BEST FOR: Recognition/Opportunity motivated players who need external validation. Supportive communicators who doubt themselves. Culture Carriers who need confidence to match their alignment.`,
    metadata: { youtubeUrl: 'https://youtu.be/ZhJ_e2gxOC0', exerciseId: 10 }
  },
  {
    category: 'exercise',
    subcategory: 'Confidence',
    title: 'Confidence Scripting (I Am)',
    content: `PURPOSE: Prime an aggressive, assertive identity through mantra-based self-signaling.
WHO NEEDS THIS: Players who play tentatively, defer to opponents, or lack assertiveness. Players who need to "flip the switch" before competition.
FULL PROTOCOL: Create a mantra that defines your highest self, like 'I am a relentless competitor' or 'I own the box.' Repeat it internally every time you step into the arena. This primes your identity, pushing out hesitation and ensuring you play aggressive, assertive, and without fear.
COACH INSIGHT: This is 'Self-Signaling'. You are broadcasting your intent to your own nervous system. It shifts your posture and hormone levels (testosterone vs cortisol) before the play starts.
BEST FOR: Competitive Edge and Intrinsic Growth motivated players. Direct communicators who respond to assertive language. At Risk players who need identity reinforcement.`,
    metadata: { youtubeUrl: 'https://youtu.be/Qc7q9L_NRlU', exerciseId: 11 }
  },
  {
    category: 'exercise',
    subcategory: 'Self-Talk',
    title: 'Self-Talk Optimization (Neutral Thinking)',
    content: `PURPOSE: Replace judgmental self-talk with data-driven, actionable instruction.
WHO NEEDS THIS: Players who beat themselves up after mistakes, use absolute language ("I always choke"), or get stuck in negative spirals.
FULL PROTOCOL: When you catch yourself saying 'I was terrible,' flip it immediately to data: 'My hands were slow, I need to be quicker.' Replace judgment with instruction. This keeps your brain in 'Correction Mode' rather than 'Victim Mode,' allowing you to make adjustments on the fly and stay in the fight.
COACH INSIGHT: Judgment ('I suck') is vague and unfixable. Data ('I was late') is specific and actionable. Specificity cures anxiety.
BEST FOR: All players, but essential for Supportive communicators who internalize criticism. Intrinsic Growth motivated players who can channel this into improvement. Auditory learners who are sensitive to their own internal dialogue.`,
    metadata: { youtubeUrl: 'https://youtu.be/4nw7gEFyBuQ', exerciseId: 12 }
  },
  {
    category: 'exercise',
    subcategory: 'Visualization',
    title: 'Visualization (Perfect Rep)',
    content: `PURPOSE: Build automatic muscle memory through mental rehearsal that fires the same neural pathways as physical practice.
WHO NEEDS THIS: Players preparing for big games, learning new mechanics, or recovering from injury. Valuable for all tiers as a supplemental training tool.
FULL PROTOCOL: Find a quiet spot, close your eyes, and visualize yourself executing perfectly in real-time. Feel the texture of the equipment, hear the crowd, see the result. This fires the same neural pathways as physical practice, giving you 'free reps' that build the automatic muscle memory needed to execute without thinking.
COACH INSIGHT: Include all senses (smell of grass, sound of cleat on dirt). The more sensory details, the more the brain treats the visualization as a real physical repetition.
BEST FOR: Visual learners get the most out of this exercise. Trust/Anchors maintaining their elite edge. Players preparing for specific high-pressure scenarios. Combine with Adversity Simulation for maximum effect.`,
    metadata: { youtubeUrl: 'https://youtu.be/4SxwpRLBpUA', exerciseId: 13 }
  },
  {
    category: 'exercise',
    subcategory: 'Journaling',
    title: 'Post-Performance Journaling',
    content: `PURPOSE: Convert every performance into actionable intelligence and close mental open loops.
WHO NEEDS THIS: Players who dwell on performances, carry emotional residue, or fail to learn from their mistakes systematically.
FULL PROTOCOL: Write down three things: what you did well, what needs work, and exactly how you'll fix it. This turns every performance into intelligence. It stops you from dwelling on the past and gives you a clear, tactical plan to be better tomorrow than you were today.
COACH INSIGHT: This closes the 'Open Loop'. Your brain dwells on unfinished tasks. By writing a plan, you tell your brain the task is 'handled', allowing you to mentally let go.
BEST FOR: Intrinsic Growth motivated players who love self-improvement. Reserved communicators who process better in writing. All clutch tiers—it creates a growth trajectory regardless of current level.`,
    metadata: { youtubeUrl: 'https://youtu.be/2KVr7IgVNOc', exerciseId: 14 }
  },

  // ===== NTERPRET RUBRIC - Communication (4 chunks) =====
  {
    category: 'nterpret',
    subcategory: 'communication/Direct',
    title: 'NTerpret Communication Style: Direct',
    content: `DESCRIPTION: Prioritizes clarity and efficiency. Speaks candidly and expects the same. Often perceived as blunt but values honesty above all.
COACHING STRATEGY: Be concise. Focus on 'what' and 'when'. Avoid sugarcoating feedback. Give clear, bottom-line instructions. Direct communicators respect coaches who don't waste their time. They want to know the problem, the fix, and the timeline. Avoid lengthy explanations—give them the action item and let them execute.`,
    metadata: {}
  },
  {
    category: 'nterpret',
    subcategory: 'communication/Supportive',
    title: 'NTerpret Communication Style: Supportive',
    content: `DESCRIPTION: Prioritizes harmony and connection. Values tone, reassurance, and emotional safety. Dislikes conflict and harsh criticism.
COACHING STRATEGY: Start with the positive. Use a warm tone. Validate feelings before correcting. Emphasize that feedback is for their support. Supportive communicators need to feel safe before they can absorb correction. Lead with what they did right, then frame the correction as something you're doing together. Never deliver harsh feedback publicly.`,
    metadata: {}
  },
  {
    category: 'nterpret',
    subcategory: 'communication/Expressive',
    title: 'NTerpret Communication Style: Expressive',
    content: `DESCRIPTION: Prioritizes energy and vision. Thinks out loud, uses emotion, and is often enthusiastic. Can be scattered but brings life to the dugout.
COACHING STRATEGY: Match their enthusiasm. Allow space for them to verbalize ideas. Focus on the big picture and the 'feeling' of the play. Expressive players need to talk through concepts. Let them explain their thinking—it helps them process. Channel their energy rather than suppressing it.`,
    metadata: {}
  },
  {
    category: 'nterpret',
    subcategory: 'communication/Reserved',
    title: 'NTerpret Communication Style: Reserved',
    content: `DESCRIPTION: Prioritizes observation and reflection. Speaks only when necessary and processes internally. Values logic and time to think.
COACHING STRATEGY: Give them time to process before demanding an answer. Don't mistake silence for disinterest. Ask specific, open-ended questions. Reserved players are often the deepest thinkers on the team. They need processing time—ask a question, then give them space. Follow up later rather than pressing for an immediate response.`,
    metadata: {}
  },

  // ===== NTERPRET RUBRIC - Learning (3 chunks) =====
  {
    category: 'nterpret',
    subcategory: 'learning/Visual',
    title: 'NTerpret Learning Style: Visual',
    content: `DESCRIPTION: Learns best by seeing. Processes information spatially and graphically. Needs to see the 'picture' of success.
COACHING STRATEGY: Use video analysis, diagrams, and demonstrations. 'Show, don't just tell'. Use visual cues for plays. Visual learners benefit enormously from film sessions and whiteboard breakdowns. Draw it, show it, demo it. They retain information they can see.`,
    metadata: {}
  },
  {
    category: 'nterpret',
    subcategory: 'learning/Auditory',
    title: 'NTerpret Learning Style: Auditory',
    content: `DESCRIPTION: Learns best by listening. Sensitive to tone, rhythm, and verbal cues. Can process complex verbal instructions.
COACHING STRATEGY: Use clear verbal cues. Ask them to repeat instructions back. Discuss concepts and 'talk shop' to reinforce learning. Auditory learners absorb through conversation. Debrief verbally, use consistent coaching language, and let them hear the rhythm of proper execution.`,
    metadata: {}
  },
  {
    category: 'nterpret',
    subcategory: 'learning/Kinesthetic',
    title: 'NTerpret Learning Style: Kinesthetic',
    content: `DESCRIPTION: Learns best by doing. Needs physical engagement and muscle memory. Learns through trial, error, and physical feeling.
COACHING STRATEGY: Prioritize reps and walkthroughs. Use physical cues/touch (with permission). Keep them moving; minimize long lectures. Kinesthetic learners lose focus during long verbal explanations. Get them on the field quickly, let them feel the movement, and correct through physical repetition.`,
    metadata: {}
  },

  // ===== NTERPRET RUBRIC - Motivation (4 chunks) =====
  {
    category: 'nterpret',
    subcategory: 'motivation/Intrinsic Growth',
    title: 'NTerpret Motivation Anchor: Intrinsic Growth',
    content: `DESCRIPTION: Driven by self-improvement, mastery, and the process of getting better. Competes primarily against themselves.
COACHING STRATEGY: Focus on technical details and personal bests. Track individual progress metrics. Frame challenges as skill acquisition. These players don't need external motivation—they need depth. Give them detailed feedback, specific metrics to track, and increasingly complex challenges.`,
    metadata: {}
  },
  {
    category: 'nterpret',
    subcategory: 'motivation/Competitive Edge',
    title: 'NTerpret Motivation Anchor: Competitive Edge',
    content: `DESCRIPTION: Driven by winning, ranking, and beating opponents. Thrives on comparison and high-stakes moments.
COACHING STRATEGY: Gamify practice. Use leaderboards. Frame challenges as win/loss scenarios. Put something on the line. These players light up when there's a scoreboard. Create competitions, track head-to-head stats, and raise the stakes in practice to keep them engaged.`,
    metadata: {}
  },
  {
    category: 'nterpret',
    subcategory: 'motivation/Team Commitment',
    title: 'NTerpret Motivation Anchor: Team Commitment',
    content: `DESCRIPTION: Driven by belonging, loyalty, and not letting the team down. Values the collective success over individual glory.
COACHING STRATEGY: Emphasize their role in the team success. Use partner drills. Highlight collective goals and how their effort helps the group. These players are fueled by responsibility to others. Frame their development as "the team needs you to get better at this" rather than individual achievement.`,
    metadata: {}
  },
  {
    category: 'nterpret',
    subcategory: 'motivation/Recognition',
    title: 'NTerpret Motivation Anchor: Recognition / Opportunity',
    content: `DESCRIPTION: Driven by visibility, status, and the chance to advance (recruiting, starting role). Wants to be seen.
COACHING STRATEGY: Provide public praise for good performance. Clearly map out the path to starting roles or next-level opportunities. Showcase highlights. These players perform best when they know someone is watching. Use that—create visibility opportunities, highlight their best moments, and connect current effort to future advancement.`,
    metadata: {}
  },

  // ===== ALIGNMENT RUBRIC (5 chunks) =====
  {
    category: 'alignment',
    subcategory: 'Exceptional',
    title: 'Alignment Tier: Exceptional (75-100%)',
    content: `SCORE RANGE: 75% to 100% Fit Score
RATING: EXCEPTIONAL ALIGNMENT
DESCRIPTION: This player processes the game exactly like the coach. In high-pressure moments, they will instinctively make the decision the coach would have called. They require minimal verbal instruction because the intent is implicitly understood.
COACHING ACTION: Delegate authority. Trust this player to make in-game decisions. Give them leadership roles and use them as an extension of the coaching staff on the field. They are your culture amplifiers.`,
    metadata: { scoreRange: [75, 100] }
  },
  {
    category: 'alignment',
    subcategory: 'Strong',
    title: 'Alignment Tier: Strong (62.5-74.9%)',
    content: `SCORE RANGE: 62.5% to 74.9% Fit Score
RATING: STRONG ALIGNMENT
DESCRIPTION: This player agrees with the coach's goals but may see a different path to get there. They will execute the system, but they will ask questions in the film room. This friction is healthy; it prevents the coach from becoming stale without breaking the system.
COACHING ACTION: Refine their role. Welcome their questions and use them to sharpen your own thinking. Give them enough autonomy to feel ownership while keeping them within the system's framework.`,
    metadata: { scoreRange: [62.5, 74.9] }
  },
  {
    category: 'alignment',
    subcategory: 'Conditional',
    title: 'Alignment Tier: Conditional (50-62.4%)',
    content: `SCORE RANGE: 50% to 62.4% Fit Score
RATING: CONDITIONAL ALIGNMENT
DESCRIPTION: This is a transactional fit. The player does not naturally 'get' the coach's philosophy. The relationship requires constant maintenance (clear rules, explicit rewards). If playing time drops or the team loses, the disconnect in values will surface as conflict.
COACHING ACTION: Set clear boundaries and expectations. Be explicit about rewards and consequences. Maintain consistent communication cadence. Don't assume they understand your intent—spell it out.`,
    metadata: { scoreRange: [50, 62.4] }
  },
  {
    category: 'alignment',
    subcategory: 'Developmental',
    title: 'Alignment Tier: Developmental (37.5-49.9%)',
    content: `SCORE RANGE: 37.5% to 49.9% Fit Score
RATING: DEVELOPMENTAL ALIGNMENT
DESCRIPTION: The player and coach currently process key decisions differently. Success is still possible, but only with explicit role clarity, structure, and planned communication touchpoints.
COACHING ACTION: Monitor closely. Schedule regular one-on-one check-ins. Create very explicit role definitions. Build trust through consistency rather than assuming it. Consider whether a mentorship pairing with a high-alignment teammate could help.`,
    metadata: { scoreRange: [37.5, 49.9] }
  },
  {
    category: 'alignment',
    subcategory: 'Low',
    title: 'Alignment Tier: Low Alignment (0-37.4%)',
    content: `SCORE RANGE: 0% to 37.4% Fit Score
RATING: LOW ALIGNMENT
DESCRIPTION: Current fit indicators show high friction risk. Treat this as a prompt for deeper conversation, expectation-setting, and context review before making long-term commitments.
COACHING ACTION: Evaluate fit carefully. Have an honest conversation about mutual expectations. This doesn't mean the player can't succeed—it means the relationship needs significant investment. Consider whether the effort required is sustainable for both parties.`,
    metadata: { scoreRange: [0, 37.4] }
  },

  // ===== COHORT PLAYBOOKS (4 chunks) =====
  {
    category: 'cohort',
    subcategory: 'Trust / Anchors',
    title: 'Cohort Playbook: Trust / Anchors',
    content: `CONDITION: High Clutch Factor (≥750) AND High Fit Score (≥62.5%)
PLAYER PROFILE: Elite output matching team culture. These are your best players who also buy into the system. They perform at the highest level AND understand and align with the coaching philosophy.
PLAYBOOK STRATEGY:
- Maximize their role and responsibility
- Give them leadership positions (team captain, player-coach)
- Use them as cultural ambassadors for new players
- Trust them to make in-game decisions without micromanagement
- Invest in their development—they pay the highest dividends
- They set the standard; protect their influence on team culture
WARNING: Don't take them for granted. Even anchors need recognition and development opportunities.`,
    metadata: {}
  },
  {
    category: 'cohort',
    subcategory: 'High Reward / High Maintenance',
    title: 'Cohort Playbook: High Reward / High Maintenance',
    content: `CONDITION: High Clutch Factor (≥750) AND Low Fit Score (<62.5%)
PLAYER PROFILE: Elite output but cultural mismatch. These players can win you games but may create friction in the clubhouse. They have the talent but don't naturally align with the coaching philosophy.
PLAYBOOK STRATEGY:
- Monitor their impact on team chemistry closely
- Set clear, explicit expectations for behavior and communication
- Pair them with Trust/Anchor players who can bridge the cultural gap
- Focus coaching on alignment areas, not just performance
- Use their competitive drive as a tool—frame alignment as "what winners do"
- Have honest conversations about what success looks like beyond stats
WARNING: Their talent can mask cultural damage. Watch for negative influence on younger players.`,
    metadata: {}
  },
  {
    category: 'cohort',
    subcategory: 'Culture Carriers',
    title: 'Cohort Playbook: Culture Carriers',
    content: `CONDITION: Low Clutch Factor (<750) AND High Fit Score (≥62.5%)
PLAYER PROFILE: Strong cultural fit, developing output. These players are all-in on the system but haven't reached their performance ceiling yet. They are the backbone of team culture.
PLAYBOOK STRATEGY:
- Develop their skills aggressively—they want to improve
- Use them to mentor new players on team values and expectations
- Protect their confidence during skill development phases
- Frame their development as a team investment, not a weakness
- Assign them mental training exercises that build performance under pressure
- They may never be stars, but they make stars better
WARNING: Don't overlook them for roster spots. Cutting Culture Carriers damages team morale disproportionately.`,
    metadata: {}
  },
  {
    category: 'cohort',
    subcategory: 'At Risk',
    title: 'Cohort Playbook: At Risk',
    content: `CONDITION: Low Clutch Factor (<750) AND Low Fit Score (<62.5%)
PLAYER PROFILE: Developing output and cultural mismatch. These players are currently underperforming AND don't align well with the coaching philosophy. They require the most coaching investment.
PLAYBOOK STRATEGY:
- Evaluate fit honestly—is this a development opportunity or a misfit?
- Create very structured development plans with clear milestones
- Schedule frequent check-ins to monitor both performance and alignment
- Assign foundational mental training exercises (Box Breathing, Body Scan, Post-Error Reset)
- Consider whether a different coaching approach might unlock their potential
- If improvement stalls after sustained effort, have honest conversations about mutual fit
WARNING: Don't invest disproportionate time at the expense of other cohorts. Set clear timelines for development expectations.`,
    metadata: {}
  },

  // ===== CLUTCH RUBRIC (14 chunks) =====
  {
    category: 'clutch',
    subcategory: 'tier/Elite',
    title: 'Clutch Factor Tier: Elite (850-1000)',
    content: `SCORE RANGE: 850 to 1000
PERFORMANCE PROFILE: These players consistently perform at or above their physical ceiling in high-pressure situations. They elevate in big moments rather than shrinking. Their mental game is a competitive advantage.
COACHING IMPLICATIONS: Trust them in clutch situations. Give them the ball/bat when it matters most. Use them as examples of mental excellence for the team. Continue challenging them with advanced mental training to prevent complacency. Consider using Adversity Simulation to keep their edge sharp.`,
    metadata: {}
  },
  {
    category: 'clutch',
    subcategory: 'tier/High Performer',
    title: 'Clutch Factor Tier: High Performer (700-849)',
    content: `SCORE RANGE: 700 to 849
PERFORMANCE PROFILE: These players maintain their physical abilities under pressure with minimal degradation. They are reliable in important moments and rarely make mental errors. They have strong but not elite mental frameworks.
COACHING IMPLICATIONS: They are dependable in pressure situations but may not elevate. Focus on building their "gear shift" ability—the skill of actually performing better under pressure. Wide-to-Narrow Toggles and Visualization exercises help bridge the gap to Elite.`,
    metadata: {}
  },
  {
    category: 'clutch',
    subcategory: 'tier/Solid',
    title: 'Clutch Factor Tier: Solid (550-699)',
    content: `SCORE RANGE: 550 to 699
PERFORMANCE PROFILE: These players show average mental resilience. They perform their physical abilities most of the time but may have occasional dips under high pressure. Typically perform to their training level but don't exceed it.
COACHING IMPLICATIONS: Focus on consistency. Use Box Breathing, Post-Error Reset, and Bounce-Back Planning to build a reliable mental toolkit. These players have the most room for improvement—targeted mental training can push them into High Performer territory.`,
    metadata: {}
  },
  {
    category: 'clutch',
    subcategory: 'tier/Developmental',
    title: 'Clutch Factor Tier: Developmental (400-549)',
    content: `SCORE RANGE: 400 to 549
PERFORMANCE PROFILE: These players show noticeable performance drops under pressure. They may have physical talent that doesn't translate to game situations. There is a gap between practice performance and competition performance.
COACHING IMPLICATIONS: Prioritize foundational mental skills. Start with Body Scan Check, Box Breathing, and Focus Interval Training to build baseline mental fitness. Avoid putting them in high-pressure situations until their mental skills catch up to their physical abilities.`,
    metadata: {}
  },
  {
    category: 'clutch',
    subcategory: 'tier/Low',
    title: 'Clutch Factor Tier: Low (0-399)',
    content: `SCORE RANGE: 0 to 399
PERFORMANCE PROFILE: These players experience significant performance degradation under pressure. They may freeze, panic, or make uncharacteristic errors in competition. The gap between their practice self and game self is substantial.
COACHING IMPLICATIONS: Start from the ground up with mental training. Focus on basic regulation (Box Breathing, Body Scan) before advancing to performance exercises. Build confidence gradually through small wins. Consider whether environmental factors (position, role, team dynamics) are contributing to the low score.`,
    metadata: {}
  },
  {
    category: 'clutch',
    subcategory: 'methodology/Performance Probability',
    title: 'Clutch Methodology: Performance Probability',
    content: `The Clutch Factor is fundamentally a Performance Probability score. It measures the likelihood that a player will execute their physical abilities at or above their ceiling when the situation demands it. A player with an 850 Clutch Factor has an 85% probability of performing at peak when pressure is highest. This is not a measure of physical talent—it's a measure of mental reliability under stress. Two players with identical physical skills can have dramatically different Clutch Factors based on their mental frameworks.`,
    metadata: {}
  },
  {
    category: 'clutch',
    subcategory: 'methodology/Holistic Context',
    title: 'Clutch Methodology: Holistic Context',
    content: `The Clutch Factor should never be evaluated in isolation. It must be read alongside the Fit Score (alignment), NTerpret profile (communication, learning, motivation), and cohort classification. A player with a 900 Clutch Factor but 30% Fit Score (High Reward / High Maintenance) requires very different management than a 900 Clutch Factor with 85% Fit Score (Trust / Anchor). Context determines strategy.`,
    metadata: {}
  },
  {
    category: 'clutch',
    subcategory: 'methodology/Walk-On Mentality',
    title: 'Clutch Methodology: Walk-On Mentality',
    content: `The Walk-On Mentality insight: Players who have had to fight for their position (walk-ons, late-round recruits, players who were cut and came back) often develop higher Clutch Factors than heavily recruited players. The adversity of proving themselves builds mental resilience naturally. When evaluating recruits, consider their journey—not just their current stats. A player who earned everything may outperform a more talented player who was given everything.`,
    metadata: {}
  },
  {
    category: 'clutch',
    subcategory: 'methodology/Physical Mental Gap',
    title: 'Clutch Methodology: Physical vs Mental Gap Analysis',
    content: `The Physical/Mental Gap is the difference between what a player CAN do (physical ceiling) and what they DO under pressure (clutch performance). A large gap means the player has untapped physical talent that mental limitations are suppressing. This is the most actionable metric for coaches—it identifies where mental training will have the highest ROI. Players with high physical ability but low Clutch Factor represent the biggest upside in your roster.`,
    metadata: {}
  },
  {
    category: 'clutch',
    subcategory: 'correlation/Alignment',
    title: 'Clutch Predictive Correlation: Alignment Impact',
    content: `Players with higher Fit Scores (alignment with coaching philosophy) tend to develop higher Clutch Factors over time. This is because trust in the system reduces cognitive load during pressure moments. When a player trusts the coach's plan, they can focus entirely on execution rather than questioning whether they're doing the right thing. Improving alignment through communication and role clarity often unlocks latent clutch performance.`,
    metadata: {}
  },
  {
    category: 'clutch',
    subcategory: 'correlation/Communication',
    title: 'Clutch Predictive Correlation: Communication Style',
    content: `Communication style affects how players process pressure. Direct communicators often have more stable Clutch Factors because they process quickly and move on. Reserved communicators may have more variance because they internalize and need processing time. Expressive communicators can swing widely—their emotional nature amplifies both peaks and valleys. Supportive communicators are susceptible to team morale effects. Match your coaching communication to their style to stabilize clutch performance.`,
    metadata: {}
  },
  {
    category: 'clutch',
    subcategory: 'correlation/Coaching',
    title: 'Clutch Predictive Correlation: Coaching Approach',
    content: `The coaching approach that develops clutch performance varies by player profile. For Kinesthetic learners, physical drills with pressure elements (Adversity Simulation) are most effective. For Visual learners, Visualization exercises yield the highest returns. For Auditory learners, verbal coaching cues and Self-Talk Optimization create the most improvement. Matching the training modality to the learning style accelerates clutch development.`,
    metadata: {}
  },
  {
    category: 'clutch',
    subcategory: 'usage/Roster Hierarchy',
    title: 'Clutch Usage Strategy: Roster Hierarchy',
    content: `Use the Clutch Factor to build your lineup hierarchy. In high-pressure situations (close games, playoffs, rivalry matchups), lean on players with higher Clutch Factors regardless of batting average or other traditional stats. A player batting .280 with an 850 Clutch Factor is more valuable in the 9th inning than a player batting .320 with a 500 Clutch Factor. Build your "clutch lineup" separate from your "stats lineup."`,
    metadata: {}
  },
  {
    category: 'clutch',
    subcategory: 'usage/Talent Pre-Screening',
    title: 'Clutch Usage Strategy: Talent Pre-Screening',
    content: `In recruiting, use the Clutch Factor as a pre-screening tool to differentiate between physically talented players. Two recruits with similar stats and physical tools can be separated by their mental game. A recruit with a higher Clutch Factor is more likely to perform under the pressure of college athletics, adapt to a new team environment, and maintain performance when the competition level increases. Combine with Fit Score to predict not just performance but cultural integration.`,
    metadata: {}
  },

  // ===== PSYCHOMETRIC DOMAINS (1 chunk) =====
  {
    category: 'psychometric',
    subcategory: null,
    title: 'Psychometric Assessment Domains',
    content: `The NTangible psychometric assessment evaluates 10 domains that form the basis of the Fit Score (alignment percentage). Each domain measures the degree of alignment between the player's natural tendencies and the coach's philosophy:

1. ROLE DEFINITION - How the player understands and accepts their role on the team
2. ADAPTABILITY SUPPORT - How flexible the player is when plans change or adversity hits
3. COMMUNICATION STYLE - How the player prefers to give and receive information (maps to NTerpret Communication)
4. FEEDBACK CADENCE - How frequently and in what format the player needs feedback
5. PRESSURE MOTIVATION - How the player responds to high-stakes situations (correlates with Clutch Factor)
6. ACCOUNTABILITY STYLE - How the player handles responsibility for mistakes and outcomes
7. TRUST FORMATION - How the player builds trust with coaches and teammates
8. TEACHING APPROACH - How the player best absorbs new skills and concepts (maps to NTerpret Learning)
9. DECISION-MAKING - How the player processes and executes decisions under pressure
10. TEAM CULTURE - How the player contributes to or detracts from team cohesion

Each domain is scored as High, Moderate, or Low alignment. The weighted composite creates the Fit Score percentage. A player doesn't need to be "High" in all domains—it's about the pattern of alignment with the specific coach's style.`,
    metadata: {}
  },

  // ===== COACHING SYNTHESIS (4 chunks) =====
  {
    category: 'coaching',
    subcategory: 'new-player',
    title: 'Coaching Guide: How to Approach a New Player',
    content: `When meeting a new player for the first time, use this framework:

1. CHECK THEIR NTERPRET PROFILE FIRST
   - Communication Style tells you HOW to talk to them (Direct: be blunt; Supportive: be warm; Expressive: be energetic; Reserved: give space)
   - Learning Style tells you HOW to teach them (Visual: show; Auditory: explain; Kinesthetic: do)
   - Motivation Anchor tells you WHAT drives them (Growth: challenge them; Competition: gamify it; Team: connect them; Recognition: spotlight them)

2. REVIEW THEIR CLUTCH FACTOR
   - Sets expectations for pressure performance
   - Identifies mental training priorities
   - Determines how much responsibility they can handle initially

3. CHECK THEIR FIT SCORE AND COHORT
   - Trust/Anchor: Lean on them immediately
   - High Reward/High Maintenance: Set boundaries early
   - Culture Carrier: Invest in development, use for cultural integration
   - At Risk: Structure everything, communicate frequently

4. BUILD THE FIRST CONVERSATION
   - Match their communication style from the start
   - Ask about their goals (this reveals their motivation anchor)
   - Set clear expectations appropriate to their Fit Score
   - Prescribe 1-2 mental training exercises based on their Clutch tier`,
    metadata: {}
  },
  {
    category: 'coaching',
    subcategory: 'practice-plan',
    title: 'Coaching Guide: Building a Mental Training Practice Plan',
    content: `Design practice plans that integrate mental training based on Clutch Factor tiers:

FOR LOW/DEVELOPMENTAL TIER (0-549):
- Start every practice with Box Breathing Reset (4-4-4-4) to establish baseline regulation
- Include Body Scan Check before physical drills to release hidden tension
- Add Focus Interval Training to build concentration stamina
- End with Post-Performance Journaling to process the session

FOR SOLID TIER (550-699):
- Pre-practice: Confidence Scripting (I Am) to set intentions
- During practice: Wide-to-Narrow Toggles between drills to sharpen focus
- Introduce Bounce-Back Planning (If-Then) to build error recovery
- End with Post-Performance Journaling

FOR HIGH PERFORMER/ELITE TIER (700+):
- Pre-practice: Visualization (Perfect Rep) for upcoming scenarios
- During practice: Distraction Control (The Gating Drill) and Adversity Simulation
- Post-practice: Cognitive Cooldown Walk to manage intensity
- Weekly: Success Memory Bank to maintain confidence

TEAM-WIDE PROTOCOL:
- Box Breathing before high-pressure situations (universal)
- Post-Error Reset (The Flush) — make this a team-wide habit
- Self-Talk Optimization — post error-correction language on walls`,
    metadata: {}
  },
  {
    category: 'coaching',
    subcategory: 'team-dynamics',
    title: 'Coaching Guide: Managing Team Dynamics with Mixed Cohorts',
    content: `Every team has a mix of cohorts. Here's how to manage the dynamics:

TRUST/ANCHORS + HIGH REWARD/HIGH MAINTENANCE:
- Pair them together strategically. Anchors can model cultural behavior without lecturing
- Don't let HR/HM players undermine Anchor influence publicly
- Use Anchors as a bridge—they can communicate expectations in ways the coach can't

TRUST/ANCHORS + CULTURE CARRIERS:
- This is your strongest cultural pairing
- Culture Carriers look up to Anchors—use this for mentorship
- Together they set the tone for team standards

HIGH REWARD/HIGH MAINTENANCE + AT RISK:
- DANGER ZONE: HR/HM players can pull At Risk players further from alignment
- Monitor this pairing closely and intervene early
- Don't room them together, don't pair them in drills

CULTURE CARRIERS + AT RISK:
- Culture Carriers can be positive influences, but protect them
- Don't burden Culture Carriers with "fixing" At Risk players
- Use structured team activities rather than expecting organic mentorship

COMMUNICATION STYLE CONFLICTS:
- Direct + Supportive: Direct can hurt Supportive players unintentionally. Coach the Direct player on tone
- Expressive + Reserved: Expressive players may overwhelm Reserved players. Create boundaries
- Match roommates and drill partners by complementary (not identical) styles`,
    metadata: {}
  },
  {
    category: 'coaching',
    subcategory: 'pre-game',
    title: 'Coaching Guide: Pre-Game Mental Preparation Protocol',
    content: `A structured pre-game mental preparation protocol for coaches:

T-60 MINUTES: BODY PREPARATION
- Body Scan Check: Have players identify and release tension
- Light physical warmup to activate the nervous system

T-30 MINUTES: MENTAL ACTIVATION
- Visualization (Perfect Rep): 5 minutes of mental rehearsal for likely game scenarios
- Players visualize their specific role, at-bats, defensive plays
- Tailor visualization to learning style: Visual learners see it, Auditory learners hear the cues, Kinesthetic learners feel the movement

T-15 MINUTES: EMOTIONAL PRIMING
- Confidence Scripting (I Am): Players recite their personal mantras
- For Competitive Edge players: Review opponent weaknesses, frame as competition
- For Team Commitment players: Reinforce team goals and their role
- For Intrinsic Growth players: Set one personal improvement target
- For Recognition/Opportunity players: Remind them who's watching

T-5 MINUTES: REGULATION
- Box Breathing Reset (4-4-4-4): Two full cycles as a team
- Post-Error Reset: Remind everyone of their flush trigger
- Bounce-Back Plan: Quick review of "IF-THEN" protocols

DURING THE GAME:
- Between innings: Quick Box Breathing
- After errors: Immediate Flush trigger
- Pitcher changes/timeouts: Wide-to-Narrow Toggles to reset focus`,
    metadata: {}
  },

  // ===== PLAYER DATA MODEL (1 chunk) =====
  {
    category: 'player_model',
    subcategory: null,
    title: 'Player Data Model Reference',
    content: `Each player in the NTangible system has the following data fields:

- ID: Unique identifier
- NAME: Full name (format: "LastName, FirstName")
- POSITION: Baseball position (P, C, 1B, 2B, 3B, SS, LF, CF, RF, DH, UTIL)
- LEVEL: Current competition level (High School, JUCO, NCAA)
- GRADUATION YEAR: Expected graduation year (2026-2031)
- CLUTCH FACTOR: 0-1000 score measuring mental performance under pressure
- FIT SCORE: 0-100% alignment score between player and coaching philosophy
- COMMUNICATION STYLE: One of Direct, Supportive, Expressive, Reserved
- LEARNING STYLE: One of Visual, Auditory, Kinesthetic
- MOTIVATION: One of Intrinsic Growth, Competitive Edge, Team Commitment, Recognition/Opportunity
- TYPE: ROSTER (current team member) or RECRUIT (prospective player)
- ROUND: Testing round (e.g., "2026 Pre-Season")
- HISTORY: Array of 3 historical Clutch Factor scores showing trend
- ARCHETYPE: Derived from Clutch Factor + Fit Score combination:
  * High Clutch (≥750) + High Fit (≥62.5%) = Trust / Anchors
  * High Clutch (≥750) + Low Fit (<62.5%) = High Reward / High Maintenance
  * Low Clutch (<750) + High Fit (≥62.5%) = Culture Carriers
  * Low Clutch (<750) + Low Fit (<62.5%) = At Risk`,
    metadata: {}
  },

];

module.exports = { knowledgeChunks };
