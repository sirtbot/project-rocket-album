import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const TIPOS = { todas: 'Todas', comboio: 'Comboio', noite: 'Noite', paisagem: 'Paisagem', camiao: 'Camiões', cidade: 'Cidade' };
let fotos = [], visiveis = [], actual = 0;

const $ = (s) => document.querySelector(s);
const grelha = $('#grelha'), caixa = $('#caixa'), img = $('#caixa-img');

async function carregar() {
  const r = await fetch('/photos.json', { cache: 'no-store' });
  fotos = (await r.json()).filter((f) => f.score > 0);
  $('#total').textContent = fotos.length;
  filtros();
  mostrar('todas');
}

function filtros() {
  const nav = $('#filtros');
  const presentes = new Set(fotos.map((f) => f.tipo));
  nav.innerHTML = '';
  for (const [k, v] of Object.entries(TIPOS)) {
    if (k !== 'todas' && !presentes.has(k)) continue;
    const b = document.createElement('button');
    b.textContent = v;
    b.dataset.tipo = k;
    b.onclick = () => mostrar(k);
    nav.appendChild(b);
  }
}

function mostrar(tipo) {
  document.querySelectorAll('.filtros button').forEach((b) => b.classList.toggle('activo', b.dataset.tipo === tipo));
  visiveis = distribuir(tipo === 'todas' ? fotos : fotos.filter((f) => f.tipo === tipo));
  grelha.innerHTML = '';
  if (!visiveis.length) { grelha.innerHTML = '<div class="vazio">Ainda sem fotos aqui.</div>'; return; }
  visiveis.forEach((f, i) => {
    const el = document.createElement('article');
    el.className = 'peca' + (f.hero ? ' g' : f.score >= 8 && i % 5 === 2 ? ' l' : '');
    el.innerHTML = `<img src="/photos/thumb/${f.file}" alt="${f.legenda}" loading="lazy">
      <div class="veu"></div><span class="n">${String(i + 1).padStart(2, '0')}</span>
      <div class="leg"><small>${TIPOS[f.tipo] || f.tipo} · ${hora(f.file)}</small>${f.legenda}</div>`;
    el.onclick = () => abrir(i);
    grelha.appendChild(el);
  });
  animar();
}

// Uma foto grande a cada 6 pecas, em vez de todas as grandes empilhadas no topo.
function distribuir(lista) {
  const grandes = lista.filter((f) => f.hero), resto = lista.filter((f) => !f.hero), saida = [];
  while (grandes.length || resto.length) {
    if (grandes.length) saida.push(grandes.shift());
    saida.push(...resto.splice(0, 5));
  }
  return saida;
}

function hora(file) {
  const m = file.match(/_(\d{2})(\d{2})\d{2}\./);
  return m ? `${m[1]}:${m[2]}` : '';
}

const SEM_MOVIMENTO = matchMedia('(prefers-reduced-motion: reduce)').matches;

function animar() {
  if (SEM_MOVIMENTO) return;
  ScrollTrigger.getAll().forEach((t) => t.kill());
  gsap.set('.peca', { opacity: 0, y: 24 });
  ScrollTrigger.batch('.peca', {
    start: 'top 95%',
    once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: .7, stagger: .06, ease: 'power3.out', overwrite: true }),
  });
  ScrollTrigger.refresh();
}

function abrir(i) {
  actual = i;
  pintar();
  caixa.classList.add('aberta');
  caixa.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  gsap.fromTo(img, { scale: .94, opacity: 0 }, { scale: 1, opacity: 1, duration: .35, ease: 'power2.out' });
}

function pintar() {
  const f = visiveis[actual];
  img.src = `/photos/full/${f.file}`;
  img.alt = f.legenda;
  $('#caixa-legenda').textContent = f.legenda;
  $('#caixa-n').textContent = `${actual + 1} / ${visiveis.length}`;
  [1, -1].forEach((d) => { const p = visiveis[actual + d]; if (p) new Image().src = `/photos/full/${p.file}`; });
}

function mover(d) {
  actual = (actual + d + visiveis.length) % visiveis.length;
  gsap.fromTo(img, { x: 30 * d, opacity: 0 }, { x: 0, opacity: 1, duration: .3, onStart: pintar });
}

function fechar() {
  caixa.classList.remove('aberta');
  caixa.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

$('#fechar').onclick = fechar;
$('#seg').onclick = () => mover(1);
$('#ant').onclick = () => mover(-1);
caixa.onclick = (e) => { if (e.target === caixa) fechar(); };
document.addEventListener('keydown', (e) => {
  if (!caixa.classList.contains('aberta')) return;
  if (e.key === 'Escape') fechar();
  if (e.key === 'ArrowRight') mover(1);
  if (e.key === 'ArrowLeft') mover(-1);
});
let x0 = 0;
caixa.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
caixa.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) mover(dx < 0 ? 1 : -1); });

if (!SEM_MOVIMENTO) {
  gsap.from('.etiqueta', { y: 12, opacity: 0, duration: .5, delay: .1 });
  gsap.from('.titulo span', { y: 40, opacity: 0, duration: .8, stagger: .12, ease: 'power3.out', delay: .2 });
  gsap.from('.sub', { y: 16, opacity: 0, duration: .6, delay: .6 });
}
carregar();
