const YEAR_SUFFIX_RE = /\s*\(\d{4}-\d{4}\)\s*$/;
const DUPLICATE_SUFFIX_RE = /\s+-\s+.+$/;

/** Display name shown in UI, e.g. "KG 2 A" */
export const stripYearSuffix = (className: string): string =>
  className.replace(YEAR_SUFFIX_RE, '').trim();

/** DB-stored unique name, e.g. "KG 2 A (2025-2026)" */
export const formatClassNameForYear = (
  displayName: string,
  yearName: string
): string => {
  const base = stripYearSuffix(displayName);
  return `${base} (${yearName})`;
};

const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/** Remove grade prefix from class display name to get section (e.g. "KG 1 A" + grade "kg 1" → "A") */
export const extractSectionFromClassName = (
  className: string,
  gradeName: string | null | undefined
): string => {
  let display = stripYearSuffix(className);
  const dup = display.match(DUPLICATE_SUFFIX_RE);
  if (dup) {
    display = display.slice(0, dup.index).trim();
  }

  if (gradeName) {
    const gradeNorm = normalize(gradeName);
    const displayNorm = normalize(display);
    if (displayNorm.startsWith(gradeNorm)) {
      const remainder = display.slice(display.toLowerCase().indexOf(gradeNorm) + gradeName.length).trim();
      if (remainder) {
        return remainder;
      }
    }
  }

  const tokens = display.split(/\s+/);
  const last = tokens[tokens.length - 1];
  if (last && /^[A-Za-z]$/.test(last)) {
    return last.toUpperCase();
  }

  if (tokens.length >= 2) {
    return tokens.slice(1).join(' ');
  }

  return '';
};

/** Build next display class name: "KG 1 A" + next grade "KG 2" → "KG 2 A" */
export const extractSectionAndBuildNextClassName = (
  currentClassName: string,
  currentGradeName: string | null | undefined,
  nextGradeName: string
): string => {
  const section = extractSectionFromClassName(currentClassName, currentGradeName);
  if (section) {
    return `${nextGradeName} ${section}`;
  }
  return nextGradeName;
};

/** Repeater: same grade display name in new year context */
export const buildRepeatClassDisplayName = (
  currentClassName: string,
  currentGradeName: string | null | undefined
): string => {
  const section = extractSectionFromClassName(currentClassName, currentGradeName);
  if (currentGradeName && section) {
    return `${currentGradeName} ${section}`;
  }
  return stripYearSuffix(currentClassName);
};
