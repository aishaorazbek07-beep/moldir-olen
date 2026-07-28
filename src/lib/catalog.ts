import { sql } from './db';

export interface Poet {
  id: number;
  name: string;
  region: string;
  bio: string;
  quote: string;
  imageUrl: string;
  isActive: boolean;
  displayOrder: number;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  description: string;
  price: number;
  buyUrl: string;
  imageUrl: string;
  isActive: boolean;
  displayOrder: number;
}

/**
 * Поэты и книги. При недоступной базе отдаём пустые списки, а не исключение:
 * разделы просто не показываются, а голосование продолжает работать.
 */
export async function loadPoets(includeHidden = false): Promise<Poet[]> {
  try {
    type Row = {
      id: number; name: string; region: string; bio: string; quote: string;
      image_url: string; is_active: boolean; display_order: number;
    };

    const rows = includeHidden
      ? await sql<Row[]>`select * from poets order by display_order, id`
      : await sql<Row[]>`select * from poets where is_active order by display_order, id`;

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      region: r.region,
      bio: r.bio,
      quote: r.quote,
      imageUrl: r.image_url,
      isActive: r.is_active,
      displayOrder: r.display_order,
    }));
  } catch {
    return [];
  }
}

export async function loadBooks(includeHidden = false): Promise<Book[]> {
  try {
    type Row = {
      id: number; title: string; author: string; description: string; price: number;
      buy_url: string; image_url: string; is_active: boolean; display_order: number;
    };

    const rows = includeHidden
      ? await sql<Row[]>`select * from books order by display_order, id`
      : await sql<Row[]>`select * from books where is_active order by display_order, id`;

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      author: r.author,
      description: r.description,
      price: Number(r.price),
      buyUrl: r.buy_url,
      imageUrl: r.image_url,
      isActive: r.is_active,
      displayOrder: r.display_order,
    }));
  } catch {
    return [];
  }
}

// --- правки из админки ------------------------------------------------------

export interface PoetInput {
  name: string; region: string; bio: string; quote: string; imageUrl: string; isActive: boolean;
}

export async function createPoet(i: PoetInput): Promise<void> {
  await sql`
    insert into poets (name, region, bio, quote, image_url, is_active, display_order)
    values (${i.name}, ${i.region}, ${i.bio}, ${i.quote}, ${i.imageUrl}, ${i.isActive},
            coalesce((select max(display_order) + 1 from poets), 1))
  `;
}

export async function updatePoet(id: number, i: PoetInput): Promise<void> {
  await sql`
    update poets set name = ${i.name}, region = ${i.region}, bio = ${i.bio},
      quote = ${i.quote}, image_url = ${i.imageUrl}, is_active = ${i.isActive}
    where id = ${id}
  `;
}

export async function deletePoet(id: number): Promise<void> {
  await sql`delete from poets where id = ${id}`;
}

export interface BookInput {
  title: string; author: string; description: string; price: number;
  buyUrl: string; imageUrl: string; isActive: boolean;
}

export async function createBook(i: BookInput): Promise<void> {
  await sql`
    insert into books (title, author, description, price, buy_url, image_url, is_active, display_order)
    values (${i.title}, ${i.author}, ${i.description}, ${i.price}, ${i.buyUrl}, ${i.imageUrl},
            ${i.isActive}, coalesce((select max(display_order) + 1 from books), 1))
  `;
}

export async function updateBook(id: number, i: BookInput): Promise<void> {
  await sql`
    update books set title = ${i.title}, author = ${i.author}, description = ${i.description},
      price = ${i.price}, buy_url = ${i.buyUrl}, image_url = ${i.imageUrl}, is_active = ${i.isActive}
    where id = ${id}
  `;
}

export async function deleteBook(id: number): Promise<void> {
  await sql`delete from books where id = ${id}`;
}
