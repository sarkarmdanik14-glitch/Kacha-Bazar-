/**
 * Universal Banglish / Transliteration & Normalization Search Utility
 *
 * Supports dynamic, universal Banglish/transliteration search for the entire product catalog.
 * Works seamlessly with ANY product present today or added in the future.
 * 
 * Examples:
 * - "আলু" / "alu" -> আলু
 * - "পেঁয়াজ" / "peyaj" / "piaz" -> পেঁয়াজ
 * - "রসুন" / "rosun" / "roshun" -> রসুন
 * - "চাল" / "chal" -> চাল
 * - "দুধ" / "dudh" / "doodh" -> দুধ
 */

/**
 * Normalizes Bengali unicode text for phonetic & graphemic consistency:
 * - Strips chandrabindu (ঁ)
 * - Normalizes nukta forms (য়, ড়, ঢ়)
 * - Equates vowel signs (ই/ঈ, উ/ঊ)
 * - Equates sibilants (স, শ, ষ)
 * - Equates nasals (ণ, ন, ং)
 * - Handles common colloquial variations (e.g., পেঁয়াজ / পিয়াজ)
 */
export function normalizeBengali(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFC")
    .replace(/\u09AF\u09BC/g, "য়")
    .replace(/\u09A1\u09BC/g, "ড়")
    .replace(/\u09A2\u09BC/g, "ঢ়")
    .replace(/\u0981/g, "") // strip chandrabindu
    .replace(/ঈ/g, "ই")
    .replace(/ী/g, "ি")
    .replace(/ঊ/g, "উ")
    .replace(/ূ/g, "ু")
    .replace(/[ষস]/g, "শ")
    .replace(/[ণং]/g, "ন")
    .replace(/য়/g, "য়")
    .replace(/প[িে][য়য়]া?জ/g, "পেয়াজ")
    .toLowerCase();
}

/**
 * Generates Banglish phonetic stem variants for any Bengali word dynamically.
 */
export function bengaliWordToBanglish(word: string): string[] {
  if (!word) return [];
  const clean = word.replace(/^[^\u0980-\u09FF]+|[^\u0980-\u09FF]+$/g, "");
  if (!clean) return [];

  const normalized = clean
    .replace(/\u0981/g, "")
    .replace(/ে[য়য়]া/g, "__EYA__")
    .replace(/ি[য়য়]া/g, "__IYA__");

  const initialVowels: Record<string, string[]> = {
    "অ": ["o", "a"],
    "আ": ["a", "aa"],
    "ই": ["i", "e"],
    "ঈ": ["i", "ee"],
    "উ": ["u", "oo"],
    "ঊ": ["u", "oo"],
    "ঋ": ["ri"],
    "এ": ["e"],
    "ঐ": ["oi", "ai"],
    "ও": ["o"],
    "ঔ": ["ou", "au"],
  };

  const kar: Record<string, string[]> = {
    "া": ["a", "aa"],
    "ি": ["i", "e"],
    "ী": ["i", "ee"],
    "ু": ["u", "oo"],
    "ূ": ["u", "oo"],
    "ৃ": ["ri"],
    "ে": ["e"],
    "ৈ": ["oi", "ai"],
    "ো": ["o"],
    "ৌ": ["ou", "au"],
  };

  const consonants: Record<string, string[]> = {
    "ক": ["k", "c"],
    "খ": ["kh", "k"],
    "গ": ["g"],
    "ঘ": ["gh"],
    "ঙ": ["ng"],
    "চ": ["ch", "c"],
    "ছ": ["ch", "chh"],
    "জ": ["j", "z"],
    "ঝ": ["jh"],
    "ঞ": ["n"],
    "ট": ["t"],
    "ঠ": ["th", "t"],
    "ড": ["d"],
    "ঢ": ["dh"],
    "ণ": ["n"],
    "ত": ["t"],
    "থ": ["th", "t"],
    "দ": ["d"],
    "ধ": ["dh"],
    "ন": ["n"],
    "প": ["p"],
    "ফ": ["f", "ph"],
    "ব": ["b"],
    "ভ": ["bh", "v", "b"],
    "ম": ["m"],
    "য": ["j", "z", "y"],
    "র": ["r"],
    "ল": ["l"],
    "শ": ["sh", "s"],
    "ষ": ["sh", "s"],
    "স": ["s", "sh"],
    "হ": ["h"],
    "ড়": ["r", "d"],
    "ঢ়": ["rh", "r"],
    "য়": ["y", "e", "i", "ia"],
    "ৎ": ["t"],
    "ং": ["ng", "n"],
    "ঃ": ["h"],
  };

  let stems: string[] = [""];
  let i = 0;
  while (i < normalized.length) {
    if (normalized.startsWith("__EYA__", i)) {
      stems = stems.flatMap((s) => [s + "eya", s + "ia", s + "iya", s + "ea"]);
      i += "__EYA__".length;
      continue;
    }
    if (normalized.startsWith("__IYA__", i)) {
      stems = stems.flatMap((s) => [s + "iya", s + "ia", s + "eya"]);
      i += "__IYA__".length;
      continue;
    }

    const ch = normalized[i];
    const nextCh = i + 1 < normalized.length ? normalized[i + 1] : "";

    if (initialVowels[ch]) {
      stems = stems.flatMap((s) => initialVowels[ch].map((v) => s + v));
    } else if (kar[ch]) {
      stems = stems.flatMap((s) => kar[ch].map((v) => s + v));
    } else if (consonants[ch]) {
      const isCons = consonants[ch];
      const hasInherent = nextCh && (consonants[nextCh] || nextCh === "্");
      stems = stems.flatMap((s) => {
        const r: string[] = [];
        for (const c of isCons) {
          r.push(s + c);
          if (hasInherent && nextCh !== "্") {
            r.push(s + c + "o");
            r.push(s + c + "a");
          }
        }
        return r;
      });
    } else if (ch === "্য") {
      stems = stems.flatMap((s) => [s + "y", s + "ia", s + "e", s + "ya"]);
    }
    i++;
    if (stems.length > 36) stems = stems.slice(0, 36);
  }

  return Array.from(new Set(stems.map((s) => s.toLowerCase())));
}

/**
 * Algorithmic parser from Latin / Banglish text to Bengali candidate tokens.
 */
export function parseBanglishToBengali(latin: string): string[] {
  if (!latin) return [];
  const s = latin.toLowerCase().trim();
  const len = s.length;

  const multiCons: [string, string[]][] = [
    ["chh", ["ছ"]],
    ["kh", ["খ", "ক"]],
    ["gh", ["ঘ", "গ"]],
    ["ch", ["চ"]],
    ["jh", ["ঝ", "জ"]],
    ["th", ["থ", "ঠ", "ত", "ট"]],
    ["dh", ["ধ", "ঢ", "দ", "ড"]],
    ["ph", ["ফ"]],
    ["bh", ["ভ", "ব"]],
    ["sh", ["শ", "স", "ষ"]],
    ["rh", ["ঢ়", "ড়"]],
    ["ng", ["ঙ", "ং"]],
  ];

  const singleCons: Record<string, string[]> = {
    k: ["ক"],
    g: ["গ"],
    c: ["চ", "ক"],
    j: ["জ"],
    z: ["জ"],
    t: ["ত", "ট"],
    d: ["দ", "ড"],
    n: ["ন", "ণ"],
    p: ["প"],
    f: ["ফ"],
    b: ["ব"],
    v: ["ভ", "ব"],
    m: ["ম"],
    r: ["র", "ড়"],
    l: ["ল"],
    s: ["স", "শ"],
    h: ["হ"],
    w: ["ও", "য়া"],
    y: ["য়", "য"],
    q: ["ক"],
    x: ["ক্স"],
  };

  const initVowels: [string, string[]][] = [
    ["aa", ["আ"]],
    ["ee", ["ঈ", "ই"]],
    ["oo", ["উ", "ঊ"]],
    ["oi", ["ঐ"]],
    ["ai", ["ঐ", "আই"]],
    ["ou", ["ঔ"]],
    ["au", ["ঔ"]],
    ["ia", ["িয়া", "েয়া"]],
    ["ea", ["িয়া", "েয়া"]],
    ["a", ["আ", "অ"]],
    ["o", ["অ", "ও"]],
    ["i", ["ই"]],
    ["u", ["উ"]],
    ["e", ["এ"]],
  ];

  const karVowels: [string, string[]][] = [
    ["aa", ["া"]],
    ["ee", ["ী", "ি"]],
    ["oo", ["ূ", "ু"]],
    ["oi", ["ৈ"]],
    ["ai", ["ৈ", "াই"]],
    ["ou", ["ৌ"]],
    ["au", ["ৌ"]],
    ["ia", ["িয়া", "েয়া", "া"]],
    ["ea", ["িয়া", "েয়া", "ে"]],
    ["a", ["া", ""]],
    ["o", ["ো", ""]],
    ["i", ["ি"]],
    ["u", ["ু"]],
    ["e", ["ে"]],
  ];

  let candidates: string[] = [""];
  let i = 0;
  let isAfterCons = false;

  while (i < len) {
    let matched = false;

    for (const [seq, bns] of multiCons) {
      if (s.startsWith(seq, i)) {
        candidates = candidates.flatMap((c) => bns.map((b) => c + b));
        i += seq.length;
        matched = true;
        isAfterCons = true;
        break;
      }
    }
    if (matched) {
      if (candidates.length > 20) candidates = candidates.slice(0, 20);
      continue;
    }

    const ch = s[i];
    if (singleCons[ch]) {
      const bns = singleCons[ch];
      candidates = candidates.flatMap((c) => bns.map((b) => c + b));
      i += 1;
      isAfterCons = true;
      if (candidates.length > 20) candidates = candidates.slice(0, 20);
      continue;
    }

    const vowelTable = isAfterCons ? karVowels : initVowels;
    for (const [seq, bns] of vowelTable) {
      if (s.startsWith(seq, i)) {
        candidates = candidates.flatMap((c) => bns.map((b) => c + b));
        i += seq.length;
        matched = true;
        isAfterCons = false;
        break;
      }
    }
    if (matched) {
      if (candidates.length > 20) candidates = candidates.slice(0, 20);
      continue;
    }

    i++;
    isAfterCons = false;
  }

  return Array.from(new Set(candidates));
}

// In-memory token cache for high-speed product filtering
const productTokenCache = new Map<string, string[]>();

export function getProductBanglishTokens(nameBn: string): string[] {
  if (!nameBn) return [];
  if (productTokenCache.has(nameBn)) {
    return productTokenCache.get(nameBn)!;
  }
  const words = nameBn.split(/[\s,()\[\]\-\/]+/);
  const allTokens: string[] = [];
  for (const word of words) {
    if (!word || word.length < 2) continue;
    const tokens = bengaliWordToBanglish(word);
    allTokens.push(...tokens);
  }
  const unique = Array.from(new Set(allTokens));
  productTokenCache.set(nameBn, unique);
  return unique;
}

/**
 * Universal product search matching function.
 * Seamlessly matches:
 * 1. Standard Bengali text and English text substring
 * 2. Normalized Bengali queries (stripping diacritics, matching phonetic equivalents)
 * 3. Transliterated Banglish inputs (e.g. alu -> আলু, peyaj / piaz -> পেঁয়াজ, rosun / roshun -> রসুন, chal -> চাল, dudh / doodh -> দুধ)
 * 4. Reverse Bengali-to-Banglish token matching
 */
export function matchesProductSearch(product: any, query: string): boolean {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;

  // 1. Direct case-insensitive substring on English & Bengali text
  if (
    (product.nameBn && product.nameBn.toLowerCase().includes(q)) ||
    (product.nameEn && product.nameEn.toLowerCase().includes(q)) ||
    (product.descriptionBn && product.descriptionBn.toLowerCase().includes(q)) ||
    (product.descriptionEn && product.descriptionEn.toLowerCase().includes(q)) ||
    (product.brand && product.brand.toLowerCase().includes(q)) ||
    (product.category && product.category.toLowerCase().includes(q)) ||
    (product.sku && product.sku.toLowerCase().includes(q))
  ) {
    return true;
  }

  // 2. Normalized Bengali match
  const normQ = normalizeBengali(q);
  const normNameBn = normalizeBengali(product.nameBn || "");
  if (normNameBn && normQ && normNameBn.includes(normQ)) {
    return true;
  }

  // 3. Banglish to Bengali candidate transliterations
  const bnCandidates = parseBanglishToBengali(q);
  for (const cand of bnCandidates) {
    const normCand = normalizeBengali(cand);
    if (normCand && normNameBn && normNameBn.includes(normCand)) {
      return true;
    }
  }

  // 4. Product Bengali name tokens to query match
  const tokens = getProductBanglishTokens(product.nameBn || "");
  for (const t of tokens) {
    if (t === q || t.startsWith(q) || (q.length >= 3 && t.includes(q))) {
      return true;
    }
  }

  return false;
}
