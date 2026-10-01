// Centralized formatting and internationalization utility

export type Language = "bn" | "en";

export const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export const BN_TO_EN_MAP: Record<string, string> = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9"
};

/**
 * Converts English digits to Bangla numerals.
 */
export const toBnNum = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null || num === "") return "";
  return num.toString().replace(/\d/g, (char) => BN_DIGITS[parseInt(char, 10)]);
};

/**
 * Converts Bangla numerals to standard English numbers.
 */
export const toEnNum = (str: string | number | undefined | null): string => {
  if (str === undefined || str === null || str === "") return "";
  return str.toString().replace(/[০-৯]/g, (char) => BN_TO_EN_MAP[char] || char);
};

/**
 * Formats a number with Bengali numerals if lang is "bn", otherwise English.
 */
export const fmtNum = (num: number | string | undefined | null, lang: string = "bn"): string => {
  if (num === undefined || num === null || num === "") return "";
  return lang === "bn" ? toBnNum(num) : num.toString();
};

/**
 * Direct translator returning Bengali or English based on lang.
 */
export const getTranslation = (lang: string, bn: string, en: string): string => {
  return lang === "bn" ? bn : en;
};

/**
 * Returns a localized helper bound to the current language:
 * const getTranslation = createTranslator(lang);
 * getTranslation("বাংলা", "English");
 */
export const createTranslator = (lang: string) => (bn: string, en: string): string => {
  return lang === "bn" ? bn : en;
};

/**
 * Formats seconds into MM:SS (e.g. 05:32), optionally in Bengali digits.
 */
export const formatTime = (totalSec: number, lang?: string): string => {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  return lang === "bn" ? toBnNum(timeStr) : timeStr;
};

/**
 * Formats a currency amount with the Taka sign (৳).
 */
export const formatPrice = (amount: number | string, lang: string = "bn"): string => {
  return `৳${fmtNum(amount, lang)}`;
};

export { generateMemberId, normalizeMemberId, getDigitalMembershipCardId } from "./memberIdUtils";
