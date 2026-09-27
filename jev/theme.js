(() => {
  const root = document.documentElement;
  const button = document.querySelector('.theme-toggle');
  const saved = localStorage.getItem('mui-mode');
  const isDark = () => root.dataset.theme === 'dark';
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
  const update = () => button.setAttribute('aria-label', `Switch to ${isDark() ? 'light' : 'dark'} mode`);
  button.addEventListener('click', () => {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    localStorage.setItem('mui-mode', root.dataset.theme);
    update();
  });
  update();
})();
