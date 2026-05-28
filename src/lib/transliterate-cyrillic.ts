/** Multi-character sequences — matched before single letters (longest first). */
const CYRILLIC_DIGRAPHS: ReadonlyArray<readonly [string, string]> = [
  ["щ", "sht"],
  ["ьо", "io"],
] as const;

/** Bulgarian Cyrillic → Latin (URL-friendly). */
const CYRILLIC_LETTER: Readonly<Record<string, string>> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  ъ: "u",
  ь: "",
  ю: "yu",
  я: "ya",
};

/**
 * Transliterates Bulgarian Cyrillic to Latin for slugs and URLs.
 * Example: `новосъбитие` → `novosubitie`
 */
export function transliterateCyrillicToLatin(input: string): string {
  let result = "";

  for (let i = 0; i < input.length; i += 1) {
    let matched = false;

    for (const [source, target] of CYRILLIC_DIGRAPHS) {
      if (input.startsWith(source, i)) {
        result += target;
        i += source.length - 1;
        matched = true;
        break;
      }
    }

    if (matched) continue;

    const ch = input[i] ?? "";
    const mapped = CYRILLIC_LETTER[ch];
    result += mapped !== undefined ? mapped : ch;
  }

  return result;
}
