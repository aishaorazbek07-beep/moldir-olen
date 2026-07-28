/**
 * Перо с росчерком — векторное, в цветах сайта.
 *
 * Нарисовано здесь, а не взято картинкой: остаётся чётким на любом экране,
 * весит около килобайта, красится через currentColor и не тянет за собой
 * вопросов с лицензией на сток.
 */
export function Quill({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="quill-feather" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#FFF6E6" />
          <stop offset="45%" stopColor="#FFC24B" />
          <stop offset="100%" stopColor="#F0439B" />
        </linearGradient>
        <linearGradient id="quill-swirl" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4BE3DA" />
          <stop offset="100%" stopColor="#FFC24B" />
        </linearGradient>
      </defs>

      {/* опахало */}
      <path
        d="M96 12c-9 1-24 5-37 15C44 38 34 55 30 72c-2 8-3 14-3 18l7-7c3-14 9-28 19-39 9-11 21-19 32-24-9 7-19 15-27 26-9 12-14 25-17 38l9-9c3-10 8-20 15-29 8-11 18-19 27-25-8 8-16 17-22 27-6 9-10 19-12 28l10-10c3-8 7-15 12-22 6-9 14-17 21-23-6 8-12 16-16 25-4 7-7 15-9 22l11-11c8-19 12-37 10-45z"
        fill="url(#quill-feather)"
      />

      {/* стержень */}
      <path
        d="M27 90 96 12"
        stroke="url(#quill-feather)"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity=".85"
      />

      {/* росчерк */}
      <path
        d="M24 95c14 10 33 12 47 5 9-4 14-11 12-16-2-4-8-4-11 0-4 5-1 13 8 17 10 5 24 4 34-2"
        stroke="url(#quill-swirl)"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/** Разделитель: тонкие линии по бокам и перо посередине. */
export function QuillDivider() {
  return (
    <div className="quill-divider" aria-hidden="true">
      <i />
      <Quill className="quill-mark" />
      <i />
    </div>
  );
}
