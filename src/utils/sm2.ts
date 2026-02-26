export interface SM2Input {
  easeFactor: number;
  repetitions: number;
  interval: number;
}

export interface SM2Output {
  easeFactor: number;
  repetitions: number;
  interval: number;
}

/**
 * Calculates the next review state using the SuperMemo-2 (SM-2) algorithm.
 * 
 * @param current The current state of the card (ease factor, repetitions, interval)
 * @param performance The user's rating of their recall ('again', 'hard', 'good', 'easy')
 * @returns The next state including the new interval in days
 */
export const calculateSM2 = (
  current: SM2Input,
  performance: 'again' | 'hard' | 'good' | 'easy'
): SM2Output => {
  let quality = 0;
  if (performance === 'easy') quality = 5;
  else if (performance === 'good') quality = 4;
  else if (performance === 'hard') quality = 3;
  else quality = 0; // 'again'

  // Default values if undefined/null (though input types enforce numbers, runtime data might differ)
  let easeFactor = current.easeFactor ?? 2.5;
  let repetitions = current.repetitions ?? 0;
  let interval = current.interval ?? 0;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      // First time seeing card — differentiate by rating
      if (quality === 5) interval = 4;       // Easy: 4 days
      else interval = 1;                      // Hard / Good: 1 day
    } else if (repetitions === 1) {
      if (quality === 3) interval = 3;        // Hard: 3 days
      else if (quality === 5) interval = 8;   // Easy: 8 days
      else interval = 6;                      // Good: 6 days
    } else {
      // Hard uses a fixed 1.2× multiplier; Good uses easeFactor; Easy adds a 1.3 bonus
      if (quality === 3) {
        interval = Math.round(interval * 1.2);
      } else if (quality === 5) {
        interval = Math.round(interval * easeFactor * 1.3);
      } else {
        interval = Math.round(interval * easeFactor);
      }
    }
    
    repetitions += 1;
    
    // Update Ease Factor
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  } else {
    // Incorrect response
    repetitions = 0;
    interval = 1;
    // easeFactor remains unchanged on failure in this variation
  }

  // Ensure Ease Factor doesn't drop below 1.3
  if (easeFactor < 1.3) easeFactor = 1.3;

  return { easeFactor, repetitions, interval };
};
