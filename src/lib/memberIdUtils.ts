/**
 * Centralized Member ID & Customer Digital ID Generation and Normalization Utility
 * Strictly enforces that every member ID begins with the 3-letter prefix "CFI".
 */

/**
 * Generates a valid unique Member/Customer ID strictly beginning with the 'CFI' prefix.
 * e.g. "CFIMWZ", "CFI782", etc.
 */
export function generateMemberId(uidOrSeed?: string): string {
  const cleanSeed = (uidOrSeed || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  let suffix = "";
  if (cleanSeed.length >= 3) {
    // Standard 3 alphanumeric characters (e.g. MWZ from uid)
    suffix = cleanSeed.substring(0, 3);
  } else {
    // Random 3-4 alphanumeric uppercase characters if seed is absent
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    suffix = (cleanSeed + randomChars).substring(0, 3);
  }
  if (!suffix || suffix.length < 3) {
    suffix = "782";
  }
  return `CFI${suffix}`;
}

/**
 * Normalizes any existing Member/Customer ID to ensure it strictly starts with the 'CFI' prefix.
 * Automatically transforms legacy/incorrect prefixes (e.g. 'FCIMWZ' -> 'CFIMWZ', 'GD123' -> 'CFI123').
 */
export function normalizeMemberId(existingId?: string | null, fallbackUidOrSeed?: string): string {
  if (existingId && typeof existingId === "string") {
    const trimmed = existingId.trim();
    if (trimmed) {
      const upper = trimmed.toUpperCase();

      // Already begins with CFI
      if (upper.startsWith("CFI")) {
        const rest = trimmed.substring(3).toUpperCase().replace(/[^a-zA-Z0-9]/g, "");
        return `CFI${rest || "782"}`;
      }

      // Legacy FCI prefix (e.g. FCIMWZ -> CFIMWZ)
      if (upper.startsWith("FCI")) {
        const rest = trimmed.substring(3).toUpperCase().replace(/[^a-zA-Z0-9]/g, "");
        return `CFI${rest || "782"}`;
      }

      // Legacy GD prefix (e.g. GD782 -> CFI782)
      if (upper.startsWith("GD")) {
        const rest = trimmed.substring(2).toUpperCase().replace(/[^a-zA-Z0-9]/g, "");
        return `CFI${rest || "782"}`;
      }

      // Any other prefix or alphanumeric string
      const clean = trimmed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (clean.length > 0) {
        const suffix = clean.length <= 4 ? clean : clean.substring(0, 3);
        return `CFI${suffix}`;
      }
    }
  }

  return generateMemberId(fallbackUidOrSeed);
}

/**
 * Formats the digital membership card identifier with the "-VERIFIED" suffix.
 * e.g. "CFIMWZ-VERIFIED"
 */
export function getDigitalMembershipCardId(memberId?: string | null, fallbackUid?: string): string {
  const normId = normalizeMemberId(memberId, fallbackUid);
  return `${normId}-VERIFIED`;
}
