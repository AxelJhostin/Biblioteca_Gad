import { useEffect, useRef, useState } from 'react';

const secret = 'axel';

export default function EasterEgg() {
  const [visible, setVisible] = useState(false);
  const taps = useRef({ count: 0, last: 0 });

  useEffect(() => {
    let typed = '';
    let hideTimer;
    const reveal = () => {
      setVisible(true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setVisible(false), 6000);
    };
    const onKeyDown = (event) => {
      if (event.target instanceof HTMLElement && event.target.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (!/^[a-z]$/i.test(event.key)) return;
      typed = `${typed}${event.key.toLowerCase()}`.slice(-secret.length);
      if (typed === secret) reveal();
    };
    const onClick = (event) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-easter-trigger]')) return;
      const now = Date.now();
      taps.current = { count: now - taps.current.last < 5000 ? taps.current.count + 1 : 1, last: now };
      if (taps.current.count === 5) { taps.current.count = 0; reveal(); }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onClick);
    return () => {
      clearTimeout(hideTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onClick);
    };
  }, []);

  if (!visible) return null;
  return <div className="easter-egg" role="status" aria-live="polite">
    <span className="easter-key"><i className="fas fa-key" /></span>
    <span><strong>Axel was here</strong><small>Encontraste el huevo de pascua.</small></span>
  </div>;
}
