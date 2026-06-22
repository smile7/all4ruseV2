type Props = {
  email: string;
  className?: string;
};

/**
 * Renders an email address reversed in the DOM with CSS RTL to visually
 * correct it. Defeats simple regex scrapers; screen readers use aria-label.
 * Copy-paste works correctly because browsers copy in visual order.
 */
export function ObfuscatedEmail({ email, className }: Props) {
  const reversed = email.split("").reverse().join("");
  return (
    <span
      aria-label={email}
      style={{ unicodeBidi: "bidi-override", direction: "rtl" }}
      className={className}
    >
      {reversed}
    </span>
  );
}
