export const IconPaths = {
  gear: (
    <>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 13.5c.06-.5.06-1 0-1.5l1.6-1.2-1.5-2.6-1.9.5a7.4 7.4 0 0 0-1.3-.8L15.8 5h-3l-.4 2.9c-.46.2-.9.47-1.3.78l-1.9-.5-1.5 2.6 1.6 1.2c-.06.5-.06 1 0 1.5l-1.6 1.2 1.5 2.6 1.9-.5c.4.32.84.58 1.3.78l.4 2.9h3l.4-2.9c.46-.2.9-.47 1.3-.78l1.9.5 1.5-2.6-1.6-1.2Z" />
    </>
  ),
  brain: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="2" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </>
  ),
  server: (
    <>
      <rect x="4" y="4" width="16" height="6" rx="1.5" />
      <rect x="4" y="14" width="16" height="6" rx="1.5" />
      <circle cx="8" cy="7" r="0.8" fill="#e6b433" stroke="none" />
      <circle cx="8" cy="17" r="0.8" fill="#e6b433" stroke="none" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M11 19h2" />
    </>
  ),
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
  rocket: (
    <>
      <path d="M12 2c3 1.5 5 4.8 5 8.5 0 2-.6 3.8-1.6 5.3L12 20l-3.4-4.2A9.9 9.9 0 0 1 7 10.5C7 6.8 9 3.5 12 2Z" />
      <circle cx="12" cy="10" r="1.8" />
      <path d="M9 17.5 7 21M15 17.5 17 21" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
    </>
  ),
  cart: (
    <>
      <circle cx="9" cy="20" r="1.2" fill="#e6b433" stroke="none" />
      <circle cx="18" cy="20" r="1.2" fill="#e6b433" stroke="none" />
      <path d="M3 4h2l2.4 11.3a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.2L20.5 8H6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  ),
  flow: (
    <>
      <circle cx="6" cy="6" r="2.3" />
      <circle cx="18" cy="6" r="2.3" />
      <circle cx="12" cy="18" r="2.3" />
      <path d="M8 7l3 9M16 7l-3 9M8.3 6h7.4" />
    </>
  ),
  shield: <path d="M12 3 5 6v5.5c0 4.2 2.9 7.6 7 8.5 4.1-.9 7-4.3 7-8.5V6l-7-3Z" />,
  design: (
    <>
      <path d="M12 3v6M12 3c3 0 5.5 2 6.6 4.8" />
      <circle cx="12" cy="15" r="6" />
    </>
  ),
  cloud: <path d="M7.5 18a4.2 4.2 0 0 1-.4-8.4A5.5 5.5 0 0 1 17.8 8a4 4 0 0 1-1.3 7.9H7.5Z" />,
  smile: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8M9 10h.01M15 10h.01" />
    </>
  ),
} as const;
