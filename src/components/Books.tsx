import type { Book } from '@/lib/catalog';
import { tenge } from '@/lib/format';
import { Reveal } from './Reveal';

/** Книги поэтов проекта. Обложка задаётся ссылкой, покупка ведёт наружу. */
export function Books({ books, title, lead }: { books: Book[]; title: string; lead: string }) {
  if (books.length === 0) return null;

  return (
    <>
      <Reveal>
        <span className="eyebrow">Кітапхана</span>
        <h2 className="h2">{title}</h2>
        {lead ? <p className="lead">{lead}</p> : null}
      </Reveal>

      <div className="books">
        {books.map((book) => (
          <Reveal key={book.id}>
            <article className="book">
              <div className="book-cover">
                {book.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.imageUrl} alt={book.title} loading="lazy" />
                ) : (
                  <span className="book-blank" aria-hidden="true">
                    <i>Мөлдір</i>
                    <b>өлең</b>
                  </span>
                )}
              </div>

              <div className="book-body">
                <h3 className="serif">{book.title}</h3>
                {book.author ? <p className="book-author">{book.author}</p> : null}
                {book.description ? <p className="book-desc">{book.description}</p> : null}

                <div className="book-foot">
                  {book.price > 0 ? <span className="book-price">{tenge(book.price)}</span> : null}
                  {book.buyUrl ? (
                    <a
                      className="btn btn-fire btn-book"
                      href={book.buyUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      Кітап алу
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </>
  );
}
