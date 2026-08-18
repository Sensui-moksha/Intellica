/**
 * pbasCalculator.js — PBAS Calculation Engine (Pure Functions)
 * ─────────────────────────────────────────────────────────────────────────────
 * Deterministic, explainable PBAS score calculation.
 * Every parameter produces a detailed calculation trace.
 *
 * This module is COMPLETELY SEPARATE from creditCalculator.js.
 * It does NOT modify, import, or interfere with the existing credit engine.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { FORMULA, getRulesForRole, UNRESOLVED_RULES, RULES_VERSION } = require("../constants/pbasRules");

// ── Input Sanitization ──────────────────────────────────────────────────────

/**
 * Safely parse a numeric value. Returns 0 for any invalid input.
 */
function safeNum(val) {
  if (val === null || val === undefined || val === "") return 0;
  const n = Number(val);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/**
 * Cap a value at a maximum. Ensures non-negative.
 */
function cap(val, max) {
  return Math.min(Math.max(safeNum(val), 0), max);
}

/**
 * Round to 2 decimal places.
 */
function round2(val) {
  return Math.round(val * 100) / 100;
}

// ── Generic Formula Helpers ─────────────────────────────────────────────────

/**
 * A. Load-based scoring: (input × maxScore) / denominator, capped.
 */
function calcLoadScore(input, maxScore, denominator) {
  const d = safeNum(denominator);
  if (d === 0) return { rawScore: 0, finalScore: 0, formula: `(${input} × ${maxScore}) / 0 → division by zero` };
  const raw = (safeNum(input) * maxScore) / d;
  const final = round2(cap(raw, maxScore));
  return {
    rawScore: round2(raw),
    finalScore: final,
    formula: `(${safeNum(input)} × ${maxScore}) / ${d}`,
  };
}

/**
 * B. Ratio-based scoring: (actual / expected) × maxScore, capped.
 */
function calcRatioScore(actual, expected, maxScore, ratioMultiplier) {
  const a = safeNum(actual);
  const e = safeNum(expected);
  const mult = ratioMultiplier || maxScore;
  if (e === 0) return { rawScore: 0, finalScore: 0, formula: `(${a} / 0) × ${mult} → division by zero` };
  const raw = (a / e) * mult;
  const final = round2(cap(raw, maxScore));
  return {
    rawScore: round2(raw),
    finalScore: final,
    formula: `(${a} / ${e}) × ${mult}`,
  };
}

/**
 * C. Count-based scoring: count × pointsPerItem, capped.
 */
function calcCountScore(count, pointsPerItem, maxScore) {
  const c = safeNum(count);
  const ppi = safeNum(pointsPerItem);
  const raw = c * ppi;
  const final = round2(cap(raw, maxScore));
  return {
    rawScore: round2(raw),
    finalScore: final,
    formula: `${c} × ${ppi}`,
  };
}

/**
 * D. Threshold/range-based scoring.
 */
function calcThresholdScore(value, thresholds, maxScore) {
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
  const final = round2(cap(score, maxScore));
  return {
    rawScore: score,
    finalScore: final,
    formula: `threshold lookup: ${v}% → range [${matchedRange}] → ${score}`,
    matchedRange,
  };
}

/**
 * E. Direct entry, capped at maxScore.
 */
function calcDirectScore(value, maxScore) {
  const v = safeNum(value);
  const final = round2(cap(v, maxScore));
  return {
    rawScore: round2(v),
    finalScore: final,
    formula: `direct entry: ${v}`,
  };
}

/**
 * G. Checklist-based scoring: iterate named activities, sum points based on
 * enabled/role selection. Used for administrative activities.
 */
function calcChecklistScore(inputs, config) {
  const activities = config.activities || [];
  const roles = config.roles || [];
  const pointsPerActivity = safeNum(config.pointsPerActivity);
  let total = 0;
  const activityResults = [];

  for (const act of activities) {
    const entry = inputs?.[act.key];
    let actScore = 0;
    let actRole = "NONE";
    let enabled = false;

    if (entry && (entry.enabled === true || entry === true)) {
      enabled = true;
      if (roles.length > 0 && entry.role) {
        const roleConfig = roles.find(r => r.value === entry.role);
        const multiplier = roleConfig ? roleConfig.multiplier : 1.0;
        actScore = round2(pointsPerActivity * multiplier);
        actRole = entry.role;
      } else {
        // Simple checkbox (no roles) — e.g., NSS activities, course file compliance
        actScore = pointsPerActivity;
        actRole = "CHECKED";
      }
    }

    activityResults.push({
      key: act.key,
      label: act.label,
      enabled,
      role: actRole,
      score: actScore,
    });
    total += actScore;
  }

  const final = round2(cap(total, config.maxScore));
  return {
    rawScore: round2(total),
    finalScore: final,
    formula: `checklist: ${activityResults.filter(a => a.enabled).length}/${activities.length} activities selected = ${round2(total)}`,
    activityResults,
  };
}

/**
 * F. Amount-tier lookup (for sponsored research, consultancy).
 */
function calcAmountTierScore(amount, tiers, maxScore, roleMultiplier) {
  const a = safeNum(amount);
  const mult = safeNum(roleMultiplier) || 1;
  let tierScore = 0;
  let matchedTier = "none";

  if (a > 0 && tiers && tiers.length > 0) {
    for (const t of tiers) {
      if (a >= t.min && a <= t.max) {
        tierScore = t.score;
        matchedTier = t.label || `${t.min}–${t.max}`;
        break;
      }
    }
  }

  const raw = tierScore * mult;
  const final = round2(cap(raw, maxScore));
  return {
    rawScore: round2(raw),
    finalScore: final,
    formula: `amount ₹${a} → tier [${matchedTier}] → ${tierScore} × ${mult} role multiplier`,
    matchedTier,
  };
}


// ── Parameter Calculation ───────────────────────────────────────────────────

/**
 * Calculate a single parameter's score based on its formula type and inputs.
 * Returns a detailed explainability object.
 */
function calculateParameter(paramConfig, inputs) {
  const { key, label, maxScore, formula } = paramConfig;
  const inputData = inputs || {};

  const result = {
    key,
    label,
    maxScore,
    formula: formula,
    status: "OK",
    inputValues: {},
    rawScore: 0,
    finalScore: 0,
    formulaExplain: "",
    warnings: [],
  };

  // Check for unresolved / configurable rules
  if (formula === FORMULA.CONFIGURABLE) {
    result.status = "REQUIRES_CLARIFICATION";
    result.warnings.push(paramConfig.clarificationNote || "This rule requires institutional clarification.");

    // Still allow manual entry
    const directField = paramConfig.inputFields?.[0]?.key;
    if (directField && inputData[directField] !== undefined) {
      const calc = calcDirectScore(inputData[directField], maxScore);
      result.rawScore = calc.rawScore;
      result.finalScore = calc.finalScore;
      result.formulaExplain = calc.formula + " (manual — pending clarification)";
      result.inputValues[directField] = safeNum(inputData[directField]);
    }
    return result;
  }

  switch (formula) {
    case FORMULA.LOAD: {
      const theoryLoad = safeNum(inputData.theoryLoad);
      const labLoad = safeNum(inputData.labLoad);
      const labConversion = paramConfig.labConversion || 0.5;
      const effectiveLoad = theoryLoad + (labLoad * labConversion);
      const calc = calcLoadScore(effectiveLoad, maxScore, paramConfig.denominator);

      result.inputValues = { theoryLoad, labLoad, effectiveLoad };
      result.rawScore = calc.rawScore;
      result.finalScore = calc.finalScore;
      result.formulaExplain = `effective load = ${theoryLoad} + (${labLoad} × ${labConversion}) = ${effectiveLoad}; ${calc.formula}`;
      break;
    }

    case FORMULA.RATIO: {
      const fieldNames = paramConfig.inputFields || [];
      const actualKey = fieldNames[0]?.key || "lecturesHandled";
      const expectedKey = fieldNames[1]?.key || "lecturesPlanned";
      const actual = safeNum(inputData[actualKey]);
      const expected = safeNum(inputData[expectedKey]);
      const calc = calcRatioScore(actual, expected, maxScore, paramConfig.ratioMultiplier);

      result.inputValues = { [actualKey]: actual, [expectedKey]: expected };
      result.rawScore = calc.rawScore;
      result.finalScore = calc.finalScore;
      result.formulaExplain = calc.formula;

      // Flag if this parameter has a known discrepancy
      if (paramConfig.status === "REQUIRES_CLARIFICATION") {
        result.status = "REQUIRES_CLARIFICATION";
        result.warnings.push(paramConfig.clarificationNote || "This parameter has a known discrepancy.");
      }
      break;
    }

    case FORMULA.COUNT: {
      const fieldName = paramConfig.inputFields?.[0]?.key || "count";
      const count = safeNum(inputData[fieldName]);
      const calc = calcCountScore(count, paramConfig.pointsPerItem, maxScore);

      result.inputValues = { [fieldName]: count };
      result.rawScore = calc.rawScore;
      result.finalScore = calc.finalScore;
      result.formulaExplain = calc.formula;
      break;
    }

    case FORMULA.THRESHOLD: {
      const fieldName = paramConfig.inputFields?.[0]?.key || "value";
      const value = safeNum(inputData[fieldName]);
      // Clamp percentage to 0-100
      const clampedValue = Math.min(Math.max(value, 0), 100);
      const calc = calcThresholdScore(clampedValue, paramConfig.thresholds, maxScore);

      result.inputValues = { [fieldName]: clampedValue };
      result.rawScore = calc.rawScore;
      result.finalScore = calc.finalScore;
      result.formulaExplain = calc.formula;
      break;
    }

    case FORMULA.DIRECT: {
      // Check for amount tiers first
      if (paramConfig.amountTiers) {
        const fieldName = paramConfig.inputFields?.[0]?.key || "amount";
        const amount = safeNum(inputData[fieldName]);
        const calc = calcAmountTierScore(amount, paramConfig.amountTiers, maxScore, 1);

        result.inputValues = { [fieldName]: amount };
        result.rawScore = calc.rawScore;
        result.finalScore = calc.finalScore;
        result.formulaExplain = calc.formula;
      } else {
        const fieldName = paramConfig.inputFields?.[0]?.key || "score";
        const value = safeNum(inputData[fieldName]);
        const calc = calcDirectScore(value, maxScore);

        result.inputValues = { [fieldName]: value };
        result.rawScore = calc.rawScore;
        result.finalScore = calc.finalScore;
        result.formulaExplain = calc.formula;
      }
      break;
    }

    case FORMULA.COMPONENT: {
      const componentResults = [];
      let total = 0;

      if (paramConfig.components) {
        for (const comp of paramConfig.components) {
          const compValue = safeNum(inputData[comp.key]);
          let compScore = 0;
          let compFormula = "";

          if (comp.formula === FORMULA.COUNT && comp.pointsPerItem) {
            const c = calcCountScore(compValue, comp.pointsPerItem, comp.maxScore);
            compScore = c.finalScore;
            compFormula = c.formula;
          } else {
            // Direct sub-component entry
            compScore = round2(cap(compValue, comp.maxScore));
            compFormula = `direct: ${compValue}`;
          }

          componentResults.push({
            key: comp.key,
            label: comp.label,
            input: compValue,
            maxScore: comp.maxScore,
            score: compScore,
            formula: compFormula,
          });
          total += compScore;
        }
      }

      // Apply sub-group capping if defined (e.g., Associate innovative teaching)
      if (paramConfig.subGroupCap && componentResults.length > 0) {
        const sgc = paramConfig.subGroupCap;
        const groupKeys = sgc.keys || [];
        let groupTotal = 0;
        for (const cr of componentResults) {
          if (groupKeys.includes(cr.key)) {
            groupTotal += cr.score;
          }
        }
        if (groupTotal > sgc.maxScore) {
          const excess = groupTotal - sgc.maxScore;
          total -= excess;
          // Proportionally reduce group members
          const ratio = sgc.maxScore / groupTotal;
          for (const cr of componentResults) {
            if (groupKeys.includes(cr.key)) {
              cr.score = round2(cr.score * ratio);
              cr.formula += ` (sub-group capped: ${sgc.label} max ${sgc.maxScore})`;
            }
          }
        }
      }

      // Handle sponsored research with amount tiers + role multiplier
      if (paramConfig.amountTiers) {
        const amount = safeNum(inputData.projectAmount);
        const role = inputData.roleInProject || "PI";
        const multiplier = role === "CO_PI" ? 0.5 : 1.0;
        const calc = calcAmountTierScore(amount, paramConfig.amountTiers, maxScore, multiplier);
        total = calc.finalScore;
        result.formulaExplain = calc.formula;
        result.inputValues = { projectAmount: amount, roleInProject: role };
      }

      result.rawScore = round2(total);
      result.finalScore = round2(cap(total, maxScore));
      result.inputValues = { ...result.inputValues };
      result.componentResults = componentResults;

      // Collect component inputs
      for (const comp of paramConfig.components || []) {
        result.inputValues[comp.key] = safeNum(inputData[comp.key]);
      }

      if (!result.formulaExplain) {
        result.formulaExplain = `sum of ${componentResults.length} components = ${round2(total)}`;
      }
      break;
    }

    case FORMULA.CHECKLIST: {
      const calc = calcChecklistScore(inputData, paramConfig);
      result.rawScore = calc.rawScore;
      result.finalScore = calc.finalScore;
      result.formulaExplain = calc.formula;
      result.activityResults = calc.activityResults;

      // Collect inputs
      for (const act of paramConfig.activities || []) {
        const entry = inputData?.[act.key];
        result.inputValues[act.key] = entry || { enabled: false };
      }
      break;
    }

    default:
      result.status = "UNKNOWN_FORMULA";
      result.warnings.push(`Unknown formula type: ${formula}`);
  }

  // Mark as missing if all inputs are zero/empty
  const allInputsEmpty = Object.values(result.inputValues).every(v => v === 0 || v === "" || v === null);
  if (allInputsEmpty && result.finalScore === 0) {
    result.status = result.status === "OK" ? "MISSING_DATA" : result.status;
  }

  return result;
}


// ── Section Calculation ─────────────────────────────────────────────────────

/**
 * Calculate an entire section's score.
 * Returns per-parameter breakdown and section total.
 */
function calculateSection(sectionConfig, inputs) {
  const parameterResults = [];
  let sectionTotal = 0;

  for (const param of sectionConfig.parameters) {
    const paramInputs = inputs?.[param.key] || inputs || {};
    const paramResult = calculateParameter(param, paramInputs);
    parameterResults.push(paramResult);
    sectionTotal += paramResult.finalScore;
  }

  const finalSectionScore = round2(cap(sectionTotal, sectionConfig.maxScore));

  return {
    key: sectionConfig.key,
    label: sectionConfig.label,
    maxScore: sectionConfig.maxScore,
    semesterAveraged: sectionConfig.semesterAveraged || false,
    rawTotal: round2(sectionTotal),
    finalScore: finalSectionScore,
    parameters: parameterResults,
    warnings: parameterResults.filter(p => p.warnings.length > 0).map(p => ({
      parameter: p.key,
      warnings: p.warnings,
    })),
  };
}


// ── Semester Averaging ──────────────────────────────────────────────────────

/**
 * Average two semester section scores where required.
 */
function averageSemesterScores(sem1Result, sem2Result) {
  if (!sem1Result || !sem2Result) return sem1Result || sem2Result || null;

  const avgScore = round2((sem1Result.finalScore + sem2Result.finalScore) / 2);

  // Average each parameter
  const avgParameters = sem1Result.parameters.map((p1, i) => {
    const p2 = sem2Result.parameters[i];
    if (!p2) return p1;
    return {
      ...p1,
      semester1Score: p1.finalScore,
      semester2Score: p2.finalScore,
      finalScore: round2((p1.finalScore + p2.finalScore) / 2),
      formulaExplain: `avg(sem1: ${p1.finalScore}, sem2: ${p2.finalScore}) = ${round2((p1.finalScore + p2.finalScore) / 2)}`,
      inputValues: { semester1: p1.inputValues, semester2: p2.inputValues },
    };
  });

  return {
    ...sem1Result,
    semester1Score: sem1Result.finalScore,
    semester2Score: sem2Result.finalScore,
    finalScore: round2(cap(avgScore, sem1Result.maxScore)),
    parameters: avgParameters,
    isAveraged: true,
  };
}


// ── Full PBAS Calculation ───────────────────────────────────────────────────

/**
 * Calculate the complete PBAS score for a faculty member.
 *
 * @param {string} role — "ASSISTANT_PROFESSOR" | "ASSOCIATE_PROFESSOR" | "PROFESSOR"
 * @param {Object} semester1Data — { teaching: {...}, professional: {...}, research: {...}, administrative: {...} }
 * @param {Object} semester2Data — same structure as semester1Data (optional)
 * @returns {Object} Complete PBAS result with section breakdowns, total, and metadata
 */
function calculatePBAS(role, semester1Data, semester2Data) {
  const rules = getRulesForRole(role);
  if (!rules) {
    return {
      success: false,
      error: `Invalid PBAS role: ${role}. Must be ASSISTANT_PROFESSOR, ASSOCIATE_PROFESSOR, or PROFESSOR.`,
      validRoles: ["ASSISTANT_PROFESSOR", "ASSOCIATE_PROFESSOR", "PROFESSOR"],
    };
  }

  const sem1 = semester1Data || {};
  const sem2 = semester2Data || {};
  const sectionResults = [];
  let grandTotal = 0;
  const allWarnings = [];

  for (const section of rules.sections) {
    const sem1Inputs = sem1[section.key] || {};
    const sem1Result = calculateSection(section, sem1Inputs);

    if (section.semesterAveraged && semester2Data) {
      const sem2Inputs = sem2[section.key] || {};
      const sem2Result = calculateSection(section, sem2Inputs);
      const avgResult = averageSemesterScores(sem1Result, sem2Result);
      sectionResults.push(avgResult);
      grandTotal += avgResult.finalScore;
    } else {
      sectionResults.push(sem1Result);
      grandTotal += sem1Result.finalScore;
    }

    // Collect warnings
    const sectionWarnings = sectionResults[sectionResults.length - 1].warnings;
    if (sectionWarnings.length > 0) {
      allWarnings.push({ section: section.key, warnings: sectionWarnings });
    }
  }

  const totalScore = round2(cap(grandTotal, rules.totalMax));
  const percentage = round2((totalScore / rules.totalMax) * 100);

  // Collect unresolved rules for this role
  const unresolvedForRole = UNRESOLVED_RULES.filter(u => u.role === role);

  return {
    success: true,
    role: rules.role,
    roleLabel: rules.label,
    totalMax: rules.totalMax,
    totalScore,
    percentage,
    sections: sectionResults.map(s => ({
      key: s.key,
      label: s.label,
      maxScore: s.maxScore,
      finalScore: s.finalScore,
      isAveraged: s.isAveraged || false,
      semester1Score: s.semester1Score,
      semester2Score: s.semester2Score,
      parameters: s.parameters,
    })),
    warnings: allWarnings,
    unresolvedRules: unresolvedForRole,
    metadata: {
      rulesVersion: RULES_VERSION,
      calculatedAt: new Date().toISOString(),
      hasSemester2: !!semester2Data,
    },
  };
}


module.exports = {
  // Core calculation
  calculatePBAS,
  calculateSection,
  calculateParameter,

  // Helpers (exported for testing)
  safeNum,
  cap,
  round2,
  calcLoadScore,
  calcRatioScore,
  calcCountScore,
  calcThresholdScore,
  calcDirectScore,
  calcAmountTierScore,
  calcChecklistScore,
  averageSemesterScores,
};
