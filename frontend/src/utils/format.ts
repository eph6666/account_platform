/**
 * Format TPM value to millions with one decimal place
 * @param value - The TPM value to format
 * @returns Formatted string with 'M' suffix (e.g., "12.5M")
 */
export const formatTPM = (value: number): string => {
  const millions = value / 1_000_000;
  return `${millions.toFixed(1)}M`;
};
