import type { SiteSettings } from '@/lib/content';
import { formatPhoneForDisplay, normalizePhone } from '@/lib/phone';

/**
 * Подвал — один на все страницы, живёт в layout.
 * Всё содержимое приходит из настроек, чтобы правилось из админки.
 */
export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const phone = normalizePhone(settings.contactPhone);
  const socials = [
    { url: settings.instagramUrl, label: 'Instagram', icon: <InstagramIcon /> },
    { url: settings.tiktokUrl, label: 'TikTok', icon: <TiktokIcon /> },
    { url: settings.youtubeUrl, label: 'YouTube', icon: <YoutubeIcon /> },
  ].filter((s) => s.url);

  return (
    <footer>
      <div className="footer-mark">
        <i>✦</i>
        <span className="serif">Мөлдір өлең</span>
        <i>✦</i>
      </div>

      {settings.venue ? <p className="footer-venue">📍 {settings.venue}</p> : null}

      {socials.length > 0 ? (
        <div className="socials">
          {socials.map((s) => (
            <a key={s.label} href={s.url} target="_blank" rel="noreferrer noopener">
              {s.icon}
              {s.label}
            </a>
          ))}
        </div>
      ) : null}

      {phone ? (
        <p className="footer-contact">
          Қосымша ақпарат үшін:{' '}
          <a href={`tel:+${phone.slice(1)}`}>{formatPhoneForDisplay(phone)}</a>
        </p>
      ) : null}

      <p className="footer-legal">
        © 2026 · Алматы
        {settings.authorName ? ` · Жоба авторы: ${settings.authorName}` : ''}
        {settings.authorHandle ? ` · ${settings.authorHandle}` : ''}
      </p>
      <p className="footer-legal">Қазақстан Жазушылар одағының қолдауымен</p>
    </footer>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TiktokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M14 3v11.5a3.5 3.5 0 11-3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 3c.4 2.6 2.2 4.3 5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10.5 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}
