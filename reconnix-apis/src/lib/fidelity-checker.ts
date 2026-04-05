// src/lib/fidelity-checker.ts — Verify variant claims match original page content
// Detects fabricated claims, price mismatches, inflated percentages, etc.

export type ViolationSeverity = 'critical' | 'major' | 'minor';
export type ViolationType = 'fabrication' | 'inflation' | 'omission' | 'mismatch';
export type WarningType = 'missing_element' | 'changed_tone' | 'added_claim';

export interface FidelityViolation {
  type: ViolationType;
  severity: ViolationSeverity;
  field: string;
  originalValue: string | number | undefined;
  variantValue: string | number | undefined;
  message: string;
}

export interface FidelityWarning {
  type: WarningType;
  field: string;
  message: string;
}

export interface FidelityResult {
  passes: boolean;
  violations: FidelityViolation[];
  warnings: FidelityWarning[];
  score: number; // 0-100, where 100 is perfect fidelity
}

export interface OriginalContent {
  title?: string;
  description?: string;
  features?: string[];
  price?: string;
  warranty?: string;
  returnPolicy?: string;
  rating?: string;
  reviewCount?: string;
  claim?: string;
  claims?: string[];
  specifications?: Record<string, string>;
}

export interface VariantContent {
  title?: string;
  description?: string;
  features?: string[];
  price?: string;
  warranty?: string;
  returnPolicy?: string;
  rating?: string;
  reviewCount?: string;
  claim?: string;
  claims?: string[];
  specifications?: Record<string, string>;
}

/**
 * Extract numbers from a string
 */
function extractNumbers(text: string): number[] {
  const matches = text.match(/\d+\.?\d*/g);
  return matches ? matches.map(m => parseFloat(m)) : [];
}

/**
 * Extract percentage values from text
 */
function extractPercentages(text: string): number[] {
  const matches = text.match(/(\d+\.?\d*)\s*%/g);
  return matches ? matches.map(m => parseFloat(m.replace('%', ''))) : [];
}

/**
 * Extract currency values from text
 */
function extractCurrency(text: string): number | null {
  const match = text.match(/[\$£€]\s*(\d+[,\d]*\.?\d*)/);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  return null;
}

/**
 * Check if a warranty claim has been inflated
 */
function checkWarrantyInflation(original: string, variant: string): FidelityViolation | null {
  const originalNums = extractNumbers(original);
  const variantNums = extractNumbers(variant);

  if (originalNums.length > 0 && variantNums.length > 0) {
    const originalMax = Math.max(...originalNums);
    const variantMax = Math.max(...variantNums);

    if (variantMax > originalMax) {
      return {
        type: 'fabrication',
        severity: 'critical',
        field: 'warranty',
        originalValue: original,
        variantValue: variant,
        message: `Warranty inflated from ${originalMax} to ${variantMax}`,
      };
    }
  }

  return null;
}

/**
 * Check if percentage claims have been inflated
 */
function checkPercentageInflation(original: string, variant: string, field: string): FidelityViolation | null {
  const originalPcts = extractPercentages(original);
  const variantPcts = extractPercentages(variant);

  if (originalPcts.length > 0 && variantPcts.length > 0) {
    const originalMax = Math.max(...originalPcts);
    const variantMax = Math.max(...variantPcts);

    // Allow small rounding differences
    if (variantMax > originalMax + 1) {
      return {
        type: 'inflation',
        severity: 'critical',
        field,
        originalValue: `${originalMax}%`,
        variantValue: `${variantMax}%`,
        message: `Percentage claim inflated from ${originalMax}% to ${variantMax}%`,
      };
    }
  }

  return null;
}

/**
 * Check price consistency
 */
function checkPriceMatch(original: string, variant: string): FidelityViolation | null {
  const originalPrice = extractCurrency(original);
  const variantPrice = extractCurrency(variant);

  if (originalPrice !== null && variantPrice !== null) {
    if (Math.abs(originalPrice - variantPrice) > 0.01) {
      return {
        type: 'mismatch',
        severity: 'critical',
        field: 'price',
        originalValue: original,
        variantValue: variant,
        message: `Price changed from ${original} to ${variant}`,
      };
    }
  }

  return null;
}

/**
 * Check rating consistency
 */
function checkRatingMatch(original: string, variant: string): FidelityViolation | null {
  const originalNums = extractNumbers(original);
  const variantNums = extractNumbers(variant);

  if (originalNums.length > 0 && variantNums.length > 0) {
    // Find rating-like numbers (typically between 1-5)
    const originalRating = originalNums.find(n => n >= 1 && n <= 5);
    const variantRating = variantNums.find(n => n >= 1 && n <= 5);

    if (originalRating && variantRating && Math.abs(originalRating - variantRating) > 0.1) {
      return {
        type: 'fabrication',
        severity: 'critical',
        field: 'rating',
        originalValue: original,
        variantValue: variant,
        message: `Rating changed from ${originalRating} to ${variantRating}`,
      };
    }
  }

  return null;
}

/**
 * Check review count consistency
 */
function checkReviewCountMatch(original: string, variant: string): FidelityViolation | null {
  const originalNums = extractNumbers(original);
  const variantNums = extractNumbers(variant);

  if (originalNums.length > 0 && variantNums.length > 0) {
    const originalCount = Math.max(...originalNums);
    const variantCount = Math.max(...variantNums);

    // Allow small variance (marketing may round), but flag big inflation
    if (variantCount > originalCount * 1.1) {
      return {
        type: 'inflation',
        severity: 'major',
        field: 'reviewCount',
        originalValue: original,
        variantValue: variant,
        message: `Review count inflated from ${originalCount} to ${variantCount}`,
      };
    }
  }

  return null;
}

/**
 * Check for required fields that are missing in the variant
 */
function checkMissingFields(original: OriginalContent, variant: VariantContent): FidelityWarning[] {
  const warnings: FidelityWarning[] = [];
  const requiredFields: (keyof OriginalContent)[] = ['warranty', 'returnPolicy', 'price'];

  for (const field of requiredFields) {
    if (original[field] && !variant[field]) {
      warnings.push({
        type: 'missing_element',
        field,
        message: `${field} present in original but missing from variant`,
      });
    }
  }

  return warnings;
}

/**
 * Check text for subjective vs factual claims
 * Marketing embellishment (subjective) is OK, factual claims must match
 */
function isSubjectiveClaim(text: string): boolean {
  const subjectivePatterns = [
    /\b(best|great|amazing|excellent|wonderful|fantastic|incredible|awesome)\b/i,
    /\b(love|enjoy|perfect|ideal)\b/i,
    /\b(leading|top|premium|quality)\b/i,
  ];

  return subjectivePatterns.some(pattern => pattern.test(text));
}

/**
 * Full fidelity check between original and variant
 */
export function checkFidelity(
  original: OriginalContent,
  variant: VariantContent
): FidelityResult {
  const violations: FidelityViolation[] = [];
  const warnings: FidelityWarning[] = [];

  // Check critical factual fields
  if (original.price && variant.price) {
    const priceViolation = checkPriceMatch(original.price, variant.price);
    if (priceViolation) violations.push(priceViolation);
  }

  if (original.warranty && variant.warranty) {
    const warrantyViolation = checkWarrantyInflation(original.warranty, variant.warranty);
    if (warrantyViolation) violations.push(warrantyViolation);
  }

  if (original.rating && variant.rating) {
    const ratingViolation = checkRatingMatch(original.rating, variant.rating);
    if (ratingViolation) violations.push(ratingViolation);
  }

  if (original.reviewCount && variant.reviewCount) {
    const reviewViolation = checkReviewCountMatch(original.reviewCount, variant.reviewCount);
    if (reviewViolation) violations.push(reviewViolation);
  }

  // Check specific claims for inflation
  if (original.claim && variant.claim) {
    const claimViolation = checkPercentageInflation(original.claim, variant.claim, 'claim');
    if (claimViolation) violations.push(claimViolation);
  }

  // Check all claims arrays
  if (original.claims && variant.claims) {
    // For each original claim, see if the variant inflated it
    original.claims.forEach((origClaim, i) => {
      if (variant.claims && variant.claims[i]) {
        const claimViolation = checkPercentageInflation(origClaim, variant.claims[i], `claims[${i}]`);
        if (claimViolation) violations.push(claimViolation);
      }
    });
  }

  // Check for missing required elements
  const missingWarnings = checkMissingFields(original, variant);
  warnings.push(...missingWarnings);

  // Check descriptions for subjective vs factual differences
  if (original.description && variant.description) {
    // Only check if not purely subjective marketing language
    if (!isSubjectiveClaim(variant.description)) {
      const descClaimViolation = checkPercentageInflation(
        original.description,
        variant.description,
        'description'
      );
      if (descClaimViolation) violations.push(descClaimViolation);
    }
  }

  // Calculate fidelity score
  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  const majorCount = violations.filter(v => v.severity === 'major').length;
  const minorCount = violations.filter(v => v.severity === 'minor').length;

  // Score: start at 100, subtract for violations
  let score = 100;
  score -= criticalCount * 30; // Critical violations are severe
  score -= majorCount * 15;    // Major violations are significant
  score -= minorCount * 5;     // Minor violations are tolerable
  score -= warnings.length * 2; // Warnings are informational

  score = Math.max(0, Math.min(100, score));

  return {
    passes: criticalCount === 0 && majorCount === 0,
    violations,
    warnings,
    score,
  };
}

/**
 * Quick fidelity check for specific numerical values
 */
export function quickCheckNumbers(
  original: Record<string, string | number>,
  variant: Record<string, string | number>,
  criticalFields: string[] = ['price', 'warranty', 'rating']
): boolean {
  for (const field of criticalFields) {
    const origVal = original[field];
    const varVal = variant[field];

    if (origVal !== undefined && varVal !== undefined) {
      const origNum = typeof origVal === 'number' ? origVal : extractNumbers(String(origVal))[0];
      const varNum = typeof varVal === 'number' ? varVal : extractNumbers(String(varVal))[0];

      if (origNum !== undefined && varNum !== undefined) {
        // For these critical fields, variant should never exceed original
        if (field === 'warranty' && varNum > origNum) return false;
        if (field === 'price' && Math.abs(varNum - origNum) > 0.01) return false;
        if (field === 'rating' && Math.abs(varNum - origNum) > 0.1) return false;
      }
    }
  }

  return true;
}
