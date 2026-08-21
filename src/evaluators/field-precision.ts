export interface FieldScore {
  field: string;
  expected: any;
  actual: any;
  score: number; // 0.0 to 1.0
  matchType: 'EXACT' | 'FUZZY' | 'NUMERIC_TOLERANT' | 'MISMATCH';
}

export class FieldPrecisionEvaluator {
  /**
   * Compare extracted fields against ground truth and return precision score (0.0 - 1.0)
   */
  public static evaluate(groundTruth: Record<string, any>, actual: Record<string, any>): { precision: number; fieldScores: FieldScore[] } {
    const keys = Object.keys(groundTruth);
    if (keys.length === 0) {
      return { precision: 1.0, fieldScores: [] };
    }

    const fieldScores: FieldScore[] = [];

    for (const key of keys) {
      const exp = groundTruth[key];
      const act = actual ? actual[key] : undefined;

      if (act === undefined || act === null) {
        fieldScores.push({
          field: key,
          expected: exp,
          actual: act,
          score: 0.0,
          matchType: 'MISMATCH'
        });
        continue;
      }

      if (typeof exp === 'number' && typeof act === 'number') {
        // Numeric match with 2% tolerance
        const diff = Math.abs(exp - act);
        const maxVal = Math.max(Math.abs(exp), Math.abs(act), 1);
        const relativeDiff = diff / maxVal;

        if (relativeDiff === 0) {
          fieldScores.push({ field: key, expected: exp, actual: act, score: 1.0, matchType: 'EXACT' });
        } else if (relativeDiff <= 0.02) {
          fieldScores.push({ field: key, expected: exp, actual: act, score: 0.95, matchType: 'NUMERIC_TOLERANT' });
        } else {
          fieldScores.push({ field: key, expected: exp, actual: act, score: Math.max(0, 1 - relativeDiff), matchType: 'MISMATCH' });
        }
      } else if (typeof exp === 'string' && typeof act === 'string') {
        const normExp = exp.trim().toLowerCase();
        const normAct = act.trim().toLowerCase();

        if (normExp === normAct) {
          fieldScores.push({ field: key, expected: exp, actual: act, score: 1.0, matchType: 'EXACT' });
        } else if (normExp.includes(normAct) || normAct.includes(normExp)) {
          fieldScores.push({ field: key, expected: exp, actual: act, score: 0.85, matchType: 'FUZZY' });
        } else {
          fieldScores.push({ field: key, expected: exp, actual: act, score: 0.0, matchType: 'MISMATCH' });
        }
      } else if (Array.isArray(exp) && Array.isArray(act)) {
        const matched = exp.filter(item => act.some(a => JSON.stringify(a) === JSON.stringify(item))).length;
        const arrayScore = exp.length > 0 ? matched / exp.length : 1.0;
        fieldScores.push({
          field: key,
          expected: exp,
          actual: act,
          score: arrayScore,
          matchType: arrayScore === 1.0 ? 'EXACT' : 'FUZZY'
        });
      } else {
        const isMatch = JSON.stringify(exp) === JSON.stringify(act);
        fieldScores.push({
          field: key,
          expected: exp,
          actual: act,
          score: isMatch ? 1.0 : 0.0,
          matchType: isMatch ? 'EXACT' : 'MISMATCH'
        });
      }
    }

    const totalScore = fieldScores.reduce((sum, f) => sum + f.score, 0);
    const precision = Number((totalScore / keys.length).toFixed(4));

    return {
      precision,
      fieldScores
    };
  }
}
