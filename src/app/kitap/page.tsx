import type { Metadata } from 'next';
import { Books } from '@/components/Books';
import { loadBooks } from '@/lib/catalog';
import { loadSettings } from '@/lib/content';

export const metadata: Metadata = { title: 'Кітап алу | Мөлдір өлең' };
export const dynamic = 'force-dynamic';

export default async function BooksPage() {
  const [{ settings }, books] = await Promise.all([loadSettings(), loadBooks()]);

  return (
    <section className="page-top">
      {books.length === 0 ? (
        <div className="closed-box">
          <span className="lock">📖</span>
          <h3 className="serif">Жақында</h3>
          <p>Кітаптар тізімі дайындалып жатыр.</p>
        </div>
      ) : (
        <Books books={books} title={settings.booksTitle} lead={settings.booksLead} />
      )}
    </section>
  );
}
