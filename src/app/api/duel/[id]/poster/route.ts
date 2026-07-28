import { NextResponse } from 'next/server';
import { loadPoster } from '@/lib/duels';

export const runtime = 'nodejs';

/**
 * Афиша дуэли.
 *
 * Отдаётся отдельным запросом, а не встраивается в страницу: браузер закэширует
 * её на сутки и не будет тянуть сотни килобайт при каждом открытии.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  try {
    const poster = await loadPoster(numericId);
    if (!poster) return NextResponse.json({ error: 'not found' }, { status: 404 });

    return new NextResponse(new Uint8Array(poster.data), {
      headers: {
        'Content-Type': poster.mime,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
