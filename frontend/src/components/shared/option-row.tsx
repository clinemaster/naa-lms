import * as React from "react";

/**
 * Base layout for a dropdown option: something on the left (icon chip, level
 * bars, code badge), a title and an optional one-line description. Specific
 * options (IconOption, RoleOption, LevelOption, LanguageOption) extend this.
 */
export function OptionRow({
  leading,
  title,
  description,
}: {
  leading?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <>
      {leading}
      <span className="ui-option-text">
        <span>{title}</span>
        {description && <span className="ui-option-description">{description}</span>}
      </span>
    </>
  );
}
