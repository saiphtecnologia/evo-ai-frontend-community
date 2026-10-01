// Modified by SAIPH: mirrors the head bootstrap and remains safe if called twice.
export function initTheme() {
  const root = document.documentElement;
  let preference = 'dark';

  try {
    const saved = localStorage.getItem('saiph.theme');
    const legacy = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      preference = saved;
    } else if (legacy === 'dark' || legacy === 'light') {
      preference = legacy;
      localStorage.setItem('saiph.theme', legacy);
    }
  } catch {
    preference = 'dark';
  }

  const theme = preference === 'system'
    ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : preference;
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}
