const DEFAULT_LOCAL_PORT = '8080';

/**
 * Resolve the public frontend base URL used in outbound emails (reset password,
 * account activation). Priority: `FRONTEND_BASE_URL` > `DOMAIN_NAME` > localhost.
 *
 * - Trims whitespace and trailing slashes.
 * - Auto-adds protocol (`http` for localhost, `https` otherwise) when absent.
 * - Preserves an explicit port; defaults to `:8080` only for bare localhost.
 */
export function getFrontendBaseUrl(): string {
  const explicitBase = process.env.FRONTEND_BASE_URL?.trim();
  if (explicitBase) {
    return normalizeBaseUrl(explicitBase);
  }

  const domainName = process.env.DOMAIN_NAME?.trim() || 'localhost';
  return normalizeBaseUrl(domainName);
}

function normalizeBaseUrl(raw: string): string {
  let value = raw.trim().replace(/\/+$/, '');
  if (!value) {
    value = 'localhost';
  }

  const hasProtocol = /^https?:\/\//i.test(value);
  if (hasProtocol) {
    return value;
  }

  const isLocalhost = value === 'localhost' || value.startsWith('localhost:') || value.startsWith('127.0.0.1');
  if (isLocalhost) {
    const hasPort = value.includes(':');
    return `http://${value}${hasPort ? '' : `:${DEFAULT_LOCAL_PORT}`}`;
  }

  return `https://${value}`;
}
