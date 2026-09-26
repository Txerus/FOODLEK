/**
 * Bounded linear least squares for a handful of variables.
 *
 * minimise ||A x - b||²  subject to  lower ≤ x ≤ upper
 *
 * With at most 3–4 variables we can afford an exact enumeration of active
 * sets (each variable is free, at its lower bound, or at its upper bound),
 * which keeps the result deterministic and easy to test.
 */

export interface BoundedLsqProblem {
  /** Rows of A. Every row has `n` coefficients. */
  a: number[][];
  b: number[];
  lower: number[];
  upper: number[];
}

function solveLinearSystem(m: number[][], v: number[]): number[] | null {
  const n = v.length;
  const aug = m.map((row, i) => [...row, v[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r][col]) > Math.abs(aug[pivot][col])) pivot = r;
    }
    if (Math.abs(aug[pivot][col]) < 1e-12) return null;
    [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = aug[r][col] / aug[col][col];
      for (let c = col; c <= n; c++) aug[r][c] -= f * aug[col][c];
    }
  }
  return aug.map((row, i) => row[n] / row[i]);
}

export function objective(p: BoundedLsqProblem, x: number[]): number {
  let total = 0;
  for (let r = 0; r < p.a.length; r++) {
    let s = -p.b[r];
    for (let c = 0; c < x.length; c++) s += p.a[r][c] * x[c];
    total += s * s;
  }
  return total;
}

export function solveBoundedLsq(p: BoundedLsqProblem): number[] {
  const n = p.lower.length;
  let best: number[] | null = null;
  let bestValue = Infinity;
  const combos = 3 ** n;
  for (let code = 0; code < combos; code++) {
    // state: 0 free, 1 at lower, 2 at upper
    const state: number[] = [];
    let k = code;
    for (let i = 0; i < n; i++) {
      state.push(k % 3);
      k = Math.floor(k / 3);
    }
    const x = new Array<number>(n).fill(0);
    const free: number[] = [];
    for (let i = 0; i < n; i++) {
      if (state[i] === 1) x[i] = p.lower[i];
      else if (state[i] === 2) x[i] = p.upper[i];
      else free.push(i);
    }
    if (free.length > 0) {
      // Normal equations restricted to free variables.
      const ata = free.map(() => new Array<number>(free.length).fill(0));
      const atb = new Array<number>(free.length).fill(0);
      for (let r = 0; r < p.a.length; r++) {
        let residualFixed = p.b[r];
        for (let c = 0; c < n; c++) if (state[c] !== 0) residualFixed -= p.a[r][c] * x[c];
        for (let i = 0; i < free.length; i++) {
          const ai = p.a[r][free[i]];
          atb[i] += ai * residualFixed;
          for (let j = 0; j < free.length; j++) ata[i][j] += ai * p.a[r][free[j]];
        }
      }
      const sol = solveLinearSystem(ata, atb);
      if (!sol) continue;
      let feasible = true;
      for (let i = 0; i < free.length; i++) {
        const v = sol[i];
        if (v < p.lower[free[i]] - 1e-9 || v > p.upper[free[i]] + 1e-9) {
          feasible = false;
          break;
        }
        x[free[i]] = v;
      }
      if (!feasible) continue;
    }
    const value = objective(p, x);
    if (value < bestValue - 1e-12) {
      bestValue = value;
      best = x;
    }
  }
  // All-at-bounds combinations are always feasible, so best is never null.
  return best ?? p.lower.slice();
}
