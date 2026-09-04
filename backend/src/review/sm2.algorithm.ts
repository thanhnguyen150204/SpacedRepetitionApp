/**
 * SM-2 Spaced Repetition Algorithm
 * Based on SuperMemo 2 algorithm used by Anki
 *
 * Quality rating (q):
 *  0 = Complete blackout
 *  1 = Incorrect but remembered on seeing answer
 *  2 = Incorrect but easy to recall
 *  3 = Correct with significant difficulty
 *  4 = Correct after hesitation
 *  5 = Perfect response
 */

export interface SM2Input {
  quality: number;      // 0-5
  repetitions: number;  // number of successful reviews
  easinessFactor: number; // EF, default 2.5
  interval: number;     // current interval in days
}

export interface SM2Result {
  interval: number;
  repetitions: number;
  easinessFactor: number;
  nextReviewDate: Date;
}

export function calculateSM2(input: SM2Input): SM2Result {
  const { quality, repetitions, easinessFactor, interval } = input;

  let newRepetitions = repetitions;
  let newInterval = interval;
  let newEF = easinessFactor;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easinessFactor);
    }
    newRepetitions = repetitions + 1;
  } else {
    // Incorrect response — restart
    newRepetitions = 0;
    newInterval = 1;
  }

  // Update Easiness Factor
  newEF = easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEF < 1.3) newEF = 1.3;
  newEF = parseFloat(newEF.toFixed(2));

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
  nextReviewDate.setHours(0, 0, 0, 0);

  return { interval: newInterval, repetitions: newRepetitions, easinessFactor: newEF, nextReviewDate };
}

/**
 * Map button labels to quality ratings
 */
export const QUALITY_MAP = {
  again: 0,   // Complete fail
  hard: 2,    // Hard
  good: 4,    // Good
  easy: 5,    // Easy
};
