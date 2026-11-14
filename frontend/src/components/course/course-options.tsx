// Shared course level / language options and their dropdown decorations,
// so every course dropdown in the app looks and reads the same.

import { OptionRow } from "@/components/shared/option-row";

export const LEVELS = ["Beginner", "Intermediate", "Advanced"];
export const LANGUAGES = ["English", "Spanish", "French", "Swahili"];

const LEVEL_INFO: Record<string, { description: string; bars: number }> = {
  Beginner: { description: "No prior experience needed", bars: 1 },
  Intermediate: { description: "Some background knowledge", bars: 2 },
  Advanced: { description: "For experienced learners", bars: 3 },
};

const LANGUAGE_CODES: Record<string, string> = {
  English: "EN",
  Spanish: "ES",
  French: "FR",
  Swahili: "SW",
};

function LevelBars({ count }: { count: number }) {
  return (
    <span className="ui-level-bars" aria-hidden>
      {[1, 2, 3].map((i) => (
        <span key={i} data-on={i <= count ? "" : undefined} style={{ height: `${i * 33}%` }} />
      ))}
    </span>
  );
}

/** Course level option: extends OptionRow with signal bars. */
export function LevelOption({ level }: { level: string }) {
  const info = LEVEL_INFO[level];
  return <OptionRow leading={<LevelBars count={info?.bars ?? 0} />} title={level} description={info?.description} />;
}

/** Course language option: extends OptionRow with a short code badge. */
export function LanguageOption({ language }: { language: string }) {
  const code = LANGUAGE_CODES[language] ?? language.slice(0, 2).toUpperCase();
  return <OptionRow leading={<span className="ui-code-badge">{code}</span>} title={language} />;
}
