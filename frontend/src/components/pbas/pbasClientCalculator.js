/**
 * pbasClientCalculator.js — Client-side PBAS Calculation Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Mirror of backend/services/pbasCalculator.js for instant local recalculation.
 * Pure functions, zero dependencies, deterministic.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Input Sanitization ──────────────────────────────────────────────────────
export function safeNum(val) {
  if (val === null || val === undefined || val === "") return 0;
  const n = Number(val);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function cap(val, max) {
  return Math.min(Math.max(safeNum(val), 0), max);
}

export function round2(val) {
  return Math.round(val * 100) / 100;
}

// ── Formula Helpers ─────────────────────────────────────────────────────────

export function calcLoadScore(input, maxScore, denominator) {
  const d = safeNum(denominator);
  if (d === 0) return { rawScore: 0, finalScore: 0, formula: `(${input} × ${maxScore}) / 0 → division by zero` };
  const raw = (safeNum(input) * maxScore) / d;
  const final = round2(cap(raw, maxScore));
  return { rawScore: round2(raw), finalScore: final, formula: `(${safeNum(input)} × ${maxScore}) / ${d}` };
}

export function calcRatioScore(actual, expected, maxScore, ratioMultiplier) {
  const a = safeNum(actual);
  const e = safeNum(expected);
  const mult = ratioMultiplier || maxScore;
  if (e === 0) return { rawScore: 0, finalScore: 0, formula: `(${a} / 0) × ${mult} → division by zero` };
  const raw = (a / e) * mult;
  const final = round2(cap(raw, maxScore));
  return { rawScore: round2(raw), finalScore: final, formula: `(${a} / ${e}) × ${mult}` };
}

export function calcCountScore(count, pointsPerItem, maxScore) {
  const c = safeNum(count);
  const ppi = safeNum(pointsPerItem);
  const raw = c * ppi;
  const final = round2(cap(raw, maxScore));
  return { rawScore: round2(raw), finalScore: final, formula: `${c} × ${ppi}` };
}

export function calcThresholdScore(value, thresholds, maxScore) {
  const v = safeNum(value);
  let score = 0;
  let matchedRange = "none";
  for (const t of thresholds) {
    if (v >= t.min && v <= t.max) {
      score = t.score;
      matchedRange = `${t.min}–${t.max}`;
      break;
    }
  }
  return { rawScore: score, finalScore: round2(cap(score, maxScore)), formula: `threshold: ${v}% → [${matchedRange}] → ${score}`, matchedRange };
}

export function calcDirectScore(value, maxScore) {
  const v = safeNum(value);
  return { rawScore: round2(v), finalScore: round2(cap(v, maxScore)), formula: `direct: ${v}` };
}

export function calcChecklistScore(inputs, config) {
  const activities = config.activities || [];
  const roles = config.roles || [];
  const ppa = safeNum(config.pointsPerActivity);
  let total = 0;
  const activityResults = [];
  for (const act of activities) {
    const entry = inputs?.[act.key];
    let actScore = 0, actRole = "NONE", enabled = false;
    if (entry && (entry.enabled === true || entry === true)) {
      enabled = true;
      if (roles.length > 0 && entry.role) {
        const rc = roles.find(r => r.value === entry.role);
        actScore = round2(ppa * (rc ? rc.multiplier : 1.0));
        actRole = entry.role;
      } else {
        actScore = ppa;
        actRole = "CHECKED";
      }
    }
    activityResults.push({ key: act.key, label: act.label, enabled, role: actRole, score: actScore });
    total += actScore;
  }
  return { rawScore: round2(total), finalScore: round2(cap(total, config.maxScore)), formula: `checklist: ${activityResults.filter(a => a.enabled).length}/${activities.length}`, activityResults };
}

export function calcAmountTierScore(amount, tiers, maxScore, roleMultiplier) {
  const a = safeNum(amount);
  const mult = safeNum(roleMultiplier) || 1;
  let tierScore = 0;
  let matchedTier = "none";
  if (a > 0 && tiers?.length) {
    for (const t of tiers) {
      if (a >= t.min && a <= t.max) { tierScore = t.score; matchedTier = t.label || `${t.min}–${t.max}`; break; }
    }
  }
  const raw = tierScore * mult;
  return { rawScore: round2(raw), finalScore: round2(cap(raw, maxScore)), formula: `₹${a} → [${matchedTier}] → ${tierScore} × ${mult}`, matchedTier };
}

// ── Parameter Calculation ───────────────────────────────────────────────────
const FT = {
  LOAD: "LOAD", RATIO: "RATIO", COUNT: "COUNT", THRESHOLD: "THRESHOLD",
  COMPONENT: "COMPONENT", DIRECT: "DIRECT", CONFIGURABLE: "CONFIGURABLE",
  CHECKLIST: "CHECKLIST",
};

export function calculateParameter(paramConfig, inputs) {
  const { key, label, maxScore, formula } = paramConfig;
  const inputData = inputs || {};
  const result = {
    key, label, maxScore, formula, status: "OK",
    inputValues: {}, rawScore: 0, finalScore: 0, formulaExplain: "", warnings: [],
  };

  if (formula === FT.CONFIGURABLE) {
    result.status = "REQUIRES_CLARIFICATION";
    result.warnings.push(paramConfig.clarificationNote || "Requires institutional clarification.");
    const f = paramConfig.inputFields?.[0]?.key;
    if (f && inputData[f] !== undefined) {
      const c = calcDirectScore(inputData[f], maxScore);
      result.rawScore = c.rawScore; result.finalScore = c.finalScore;
      result.formulaExplain = c.formula + " (manual)";
      result.inputValues[f] = safeNum(inputData[f]);
    }
    return result;
  }

  switch (formula) {
    case FT.LOAD: {
      const tl = safeNum(inputData.theoryLoad), ll = safeNum(inputData.labLoad);
      const lc = paramConfig.labConversion || 0.5;
      const eff = tl + ll * lc;
      const c = calcLoadScore(eff, maxScore, paramConfig.denominator);
      result.inputValues = { theoryLoad: tl, labLoad: ll, effectiveLoad: eff };
      result.rawScore = c.rawScore; result.finalScore = c.finalScore;
      result.formulaExplain = `${tl} + (${ll} × ${lc}) = ${eff}; ${c.formula}`;
      break;
    }
    case FT.RATIO: {
      const flds = paramConfig.inputFields || [];
      const aK = flds[0]?.key || "lecturesHandled", eK = flds[1]?.key || "lecturesPlanned";
      const a = safeNum(inputData[aK]), e = safeNum(inputData[eK]);
      const c = calcRatioScore(a, e, maxScore, paramConfig.ratioMultiplier);
      result.inputValues = { [aK]: a, [eK]: e };
      result.rawScore = c.rawScore; result.finalScore = c.finalScore; result.formulaExplain = c.formula;
      if (paramConfig.status === "REQUIRES_CLARIFICATION") {
        result.status = "REQUIRES_CLARIFICATION";
        result.warnings.push(paramConfig.clarificationNote || "Known discrepancy.");
      }
      break;
    }
    case FT.COUNT: {
      const f = paramConfig.inputFields?.[0]?.key || "count";
      const cnt = safeNum(inputData[f]);
      const c = calcCountScore(cnt, paramConfig.pointsPerItem, maxScore);
      result.inputValues = { [f]: cnt };
      result.rawScore = c.rawScore; result.finalScore = c.finalScore; result.formulaExplain = c.formula;
      break;
    }
    case FT.THRESHOLD: {
      const f = paramConfig.inputFields?.[0]?.key || "value";
      const v = Math.min(Math.max(safeNum(inputData[f]), 0), 100);
      const c = calcThresholdScore(v, paramConfig.thresholds, maxScore);
      result.inputValues = { [f]: v };
      result.rawScore = c.rawScore; result.finalScore = c.finalScore; result.formulaExplain = c.formula;
      break;
    }
    case FT.DIRECT: {
      if (paramConfig.amountTiers) {
        const f = paramConfig.inputFields?.[0]?.key || "amount";
        const a = safeNum(inputData[f]);
        const c = calcAmountTierScore(a, paramConfig.amountTiers, maxScore, 1);
        result.inputValues = { [f]: a };
        result.rawScore = c.rawScore; result.finalScore = c.finalScore; result.formulaExplain = c.formula;
      } else {
        const f = paramConfig.inputFields?.[0]?.key || "score";
        const v = safeNum(inputData[f]);
        const c = calcDirectScore(v, maxScore);
        result.inputValues = { [f]: v };
        result.rawScore = c.rawScore; result.finalScore = c.finalScore; result.formulaExplain = c.formula;
      }
      break;
    }
    case FT.COMPONENT: {
      const compResults = [];
      let total = 0;
      if (paramConfig.components) {
        for (const comp of paramConfig.components) {
          const cv = safeNum(inputData[comp.key]);
          let cs = 0, cf = "";
          if (comp.formula === FT.COUNT && comp.pointsPerItem) {
            const cc = calcCountScore(cv, comp.pointsPerItem, comp.maxScore);
            cs = cc.finalScore; cf = cc.formula;
          } else {
            cs = round2(cap(cv, comp.maxScore)); cf = `direct: ${cv}`;
          }
          compResults.push({ key: comp.key, label: comp.label, input: cv, maxScore: comp.maxScore, score: cs, formula: cf });
          total += cs;
        }
      }
      // Apply sub-group capping
      if (paramConfig.subGroupCap && compResults.length > 0) {
        const sgc = paramConfig.subGroupCap;
        const groupKeys = sgc.keys || [];
        let groupTotal = 0;
        for (const cr of compResults) { if (groupKeys.includes(cr.key)) groupTotal += cr.score; }
        if (groupTotal > sgc.maxScore) {
          const ratio = sgc.maxScore / groupTotal;
          total -= (groupTotal - sgc.maxScore);
          for (const cr of compResults) { if (groupKeys.includes(cr.key)) { cr.score = round2(cr.score * ratio); cr.formula += ` (capped: ${sgc.label})`; } }
        }
      }
      if (paramConfig.amountTiers) {
        const amt = safeNum(inputData.projectAmount);
        const role = inputData.roleInProject || "PI";
        const mult = role === "CO_PI" ? 0.5 : 1.0;
        const c = calcAmountTierScore(amt, paramConfig.amountTiers, maxScore, mult);
        total = c.finalScore;
        result.formulaExplain = c.formula;
        result.inputValues = { projectAmount: amt, roleInProject: role };
      }
      result.rawScore = round2(total);
      result.finalScore = round2(cap(total, maxScore));
      result.componentResults = compResults;
      for (const comp of paramConfig.components || []) result.inputValues[comp.key] = safeNum(inputData[comp.key]);
      if (!result.formulaExplain) result.formulaExplain = `sum of ${compResults.length} components = ${round2(total)}`;
      break;
    }
    case FT.CHECKLIST: {
      const c = calcChecklistScore(inputData, paramConfig);
      result.rawScore = c.rawScore; result.finalScore = c.finalScore;
      result.formulaExplain = c.formula; result.activityResults = c.activityResults;
      for (const act of paramConfig.activities || []) result.inputValues[act.key] = inputData?.[act.key] || { enabled: false };
      break;
    }
    default:
      result.status = "UNKNOWN_FORMULA";
  }

  const allEmpty = Object.values(result.inputValues).every(v => v === 0 || v === "" || v === null);
  if (allEmpty && result.finalScore === 0) result.status = result.status === "OK" ? "MISSING_DATA" : result.status;

  return result;
}

// ── Section & Full PBAS Calculation ─────────────────────────────────────────

export function calculateSection(sectionConfig, inputs) {
  const parameterResults = [];
  let sectionTotal = 0;
  for (const param of sectionConfig.parameters) {
    const r = calculateParameter(param, inputs?.[param.key] || inputs || {});
    parameterResults.push(r);
    sectionTotal += r.finalScore;
  }
  return {
    key: sectionConfig.key, label: sectionConfig.label, maxScore: sectionConfig.maxScore,
    semesterAveraged: sectionConfig.semesterAveraged || false,
    rawTotal: round2(sectionTotal), finalScore: round2(cap(sectionTotal, sectionConfig.maxScore)),
    parameters: parameterResults,
  };
}

export function averageSemesterScores(s1, s2) {
  if (!s1 || !s2) return s1 || s2 || null;
  const avg = round2((s1.finalScore + s2.finalScore) / 2);
  const avgParams = s1.parameters.map((p1, i) => {
    const p2 = s2.parameters[i];
    if (!p2) return p1;
    return {
      ...p1, semester1Score: p1.finalScore, semester2Score: p2.finalScore,
      finalScore: round2((p1.finalScore + p2.finalScore) / 2),
      formulaExplain: `avg(${p1.finalScore}, ${p2.finalScore})`,
      inputValues: { semester1: p1.inputValues, semester2: p2.inputValues },
    };
  });
  return { ...s1, semester1Score: s1.finalScore, semester2Score: s2.finalScore, finalScore: round2(cap(avg, s1.maxScore)), parameters: avgParams, isAveraged: true };
}

export function calculatePBAS(rulesForRole, semester1Data, semester2Data) {
  if (!rulesForRole) return { success: false, error: "Invalid role." };
  const sem1 = semester1Data || {}, sem2 = semester2Data || {};
  const sectionResults = [];
  let grandTotal = 0;

  for (const section of rulesForRole.sections) {
    const s1r = calculateSection(section, sem1[section.key] || {});
    if (section.semesterAveraged && semester2Data) {
      const s2r = calculateSection(section, sem2[section.key] || {});
      const avg = averageSemesterScores(s1r, s2r);
      sectionResults.push(avg);
      grandTotal += avg.finalScore;
    } else {
      sectionResults.push(s1r);
      grandTotal += s1r.finalScore;
    }
  }

  const totalScore = round2(cap(grandTotal, rulesForRole.totalMax));
  return {
    success: true, role: rulesForRole.role, roleLabel: rulesForRole.label,
    totalMax: rulesForRole.totalMax, totalScore, percentage: round2((totalScore / rulesForRole.totalMax) * 100),
    sections: sectionResults,
  };
}
