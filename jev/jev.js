const scene = document.querySelector('.scene');
const cube = document.querySelector('.decision-cube');
const rings = document.querySelectorAll('.scene-ring');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (scene && cube && !reducedMotion.matches) {
  scene.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    const bounds = scene.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    cube.style.animationPlayState = 'paused';
    cube.style.transform = `rotateX(${(-18 - y * 24).toFixed(1)}deg) rotateY(${(-26 + x * 76).toFixed(1)}deg)`;
  });
  scene.addEventListener('pointerleave', () => {
    cube.style.transform = '';
    cube.style.animationPlayState = '';
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      const state = entry.isIntersecting ? 'running' : 'paused';
      rings.forEach((ring) => { ring.style.animationPlayState = state; });
      if (!entry.isIntersecting) cube.style.animationPlayState = 'paused';
      else if (!cube.style.transform) cube.style.animationPlayState = 'running';
    }, { threshold: 0.05 });
    observer.observe(scene);
  }
}
