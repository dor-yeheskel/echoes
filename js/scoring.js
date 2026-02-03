/* =========================================================
   SCORING SYSTEM – FINAL

   PRINCIPLES
   ----------
   1. A level is completed when ALL targets are destroyed.
   2. Score measures *quality of execution*, not survival.
   3. Targets are the ONLY objectives.
   4. Refilling bombs is allowed and does NOT affect scoring.
   5. Scoring is based on:
        - bombsUsed vs number of targets
        - stealthUsed
   6. Perfect run:
        bombsUsed === totalHP  AND  stealthUsed === 0
        => maximum score.
   7. Score is never zero for a completed level.

   DEFINITIONS
   -----------
   T = total number of targets in the level
   B = bombsUsed (cumulative, never reset by refill)
   S = stealthUsed (cumulative)

   ========================================================= */

const HP_BY_SIZE = {
  small: 1,
  medium: 2,
  big: 3
};

const SCORE_RULES = {
  MAX_SCORE: 1000,

  // Stealth penalty: multiplicative factor per use
  STEALTH_PENALTY_PER_USE: 0.15, // 15% reduction per use

  // Lower bound to avoid "almost zero" scores
  MIN_COMPLETION_FACTOR: 0.25
};


/* ---------------------------------------------------------
   Calculates full score breakdown for a completed level
   --------------------------------------------------------- */
function calculateScoreBreakdown() {
  if (!state || !state.levelId) {
    return { score: 0, breakdown: null };
  }

  const level = levelToData[state.levelId];
  if (!level || !Array.isArray(level.targetLocations)) {
    return { score: 0, breakdown: null };
  }
  
  // ===== Required bombs for a perfect run =====
  const requiredBombs = level.targetLocations.reduce(
    (sum, t) => sum + (HP_BY_SIZE[t.size] || 1),
    0
  );

  const targetsCount = level.targetLocations.length;
  const bombsUsed = state.bombsUsed || 0;
  const stealthUsed = state.stealthUsed || 0;

  // ===== Efficiency factors =====
  // Perfect: bombsUsed === requiredBombs  -> 1.0
  // Waste  : bombsUsed > requiredBombs   -> < 1.0
  const bombEfficiency =
    requiredBombs / Math.max(bombsUsed, requiredBombs);

  // Stealth is optional but penalized if used
  const stealthPenalty =
    stealthUsed === 0 ? 1 : Math.max(0, 1 - stealthUsed * 0.15);

  // ===== Final score =====
  const BASE_SCORE = 1000;

  let score =
    BASE_SCORE *
    bombEfficiency *
    stealthPenalty;

  // Safety: never NaN / never zero
  score = Math.max(1, Math.round(score));

  // ===== Breakdown for UI / persistence =====
  return {
    score,
    breakdown: {
      targets: targetsCount,
      requiredBombs,
      bombsUsed,
      stealthUsed,
      bombEfficiency: Number(bombEfficiency.toFixed(3)),
      stealthPenalty: Number(stealthPenalty.toFixed(3))
    }
  };
}


/* ---------------------------------------------------------
   Maximum possible score (used by UI / rank logic)
   --------------------------------------------------------- */
function getMaxScore() {
  return SCORE_RULES.MAX_SCORE;
}


/* ---------------------------------------------------------
   Rank based purely on normalized score
   --------------------------------------------------------- */
function getRank(score) {
  const ratio = score / SCORE_RULES.MAX_SCORE;

  if (ratio >= 0.9) return "🥇 Gold";
  if (ratio >= 0.7) return "🥈 Silver";
  return "🥉 Bronze";
}
