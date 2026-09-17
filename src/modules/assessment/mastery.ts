/**
 * Bayesian Knowledge Tracing (Phase B §4) per structure/competency, plus SM-2-style
 * spacing. Corbett AT, Anderson JR. Knowledge tracing. UMUAI 1995;4:253–278.
 */
export interface BktParams { pInit: number; pLearn: number; pGuess: number; pSlip: number }
export const DEFAULT_BKT: BktParams = { pInit: 0.2, pLearn: 0.15, pGuess: 0.2, pSlip: 0.1 };

export function updateMastery(pKnown: number, correct: boolean, p: BktParams = DEFAULT_BKT): number {
  const pCorrectGivenKnown = 1 - p.pSlip;
  const pCorrectGivenUnknown = p.pGuess;
  const posterior = correct
    ? (pKnown * pCorrectGivenKnown) / (pKnown * pCorrectGivenKnown + (1 - pKnown) * pCorrectGivenUnknown)
    : (pKnown * p.pSlip) / (pKnown * p.pSlip + (1 - pKnown) * (1 - pCorrectGivenUnknown));
  return posterior + (1 - posterior) * p.pLearn;
}

/** Next review interval in days given mastery and consecutive correct count. */
export function nextInterval(pKnown: number, streak: number): number {
  if (pKnown < 0.5) return 1;
  const base = [1, 3, 7, 14, 30, 60][Math.min(streak, 5)] ?? 60;
  return Math.round(base * (0.5 + pKnown));
}
