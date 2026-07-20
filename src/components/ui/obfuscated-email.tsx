type Props = {
  email: string;
  className?: string;
};

function toSpokenEmail(email: string): string {
  return email.replaceAll("@", " at ").replaceAll(".", " dot ");
}

/**
 * Renders an email without a literal "@" in the DOM text, so simple scrapers
 * that match `user@domain` patterns miss it. Screen readers get a spoken form
 * via aria-label. Prefer clicking the surrounding mailto link over copy-paste.
 */
export function ObfuscatedEmail({ email, className }: Props) {
  const atIndex = email.lastIndexOf("@");
  const display =
    atIndex === -1
      ? email
      : `${email.slice(0, atIndex)} at ${email.slice(atIndex + 1)}`;

  return (
    <span aria-label={toSpokenEmail(email)} className={className}>
      {display}
    </span>
  );
}
