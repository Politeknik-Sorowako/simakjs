import { useNavigate, useSearchParams } from '@solidjs/router';
import { createEffect } from 'solid-js';

export function parseProtocolUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url.startsWith('web+simak://')) return null;

  const target = url.slice('web+simak://'.length);
  if (target.startsWith('rombel/enroll/')) {
    const token = target.slice('rombel/enroll/'.length);
    if (token) return `/rombel/enroll/${encodeURIComponent(token)}`;
  }

  return null;
}

export default function ProtocolHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  createEffect(() => {
    const data = searchParams.data as string | undefined;
    const target = data ? parseProtocolUrl(data) : null;
    navigate(target || '/dashboard', { replace: true });
  });

  return null;
}
