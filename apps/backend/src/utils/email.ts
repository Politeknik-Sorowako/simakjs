const DEFAULT_EMAIL_FROM = 'SIMAK <postman@politekniksorowako.ac.id>';

/**
 * Resolve the sender address used for outbound emails via Resend.
 * Priority: `EMAIL_FROM` env > default SIMAK sender on the verified campus domain.
 */
export function getEmailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_EMAIL_FROM;
}
