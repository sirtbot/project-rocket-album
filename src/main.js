import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const DISCORD = 'https://discord.gg/keBr8g3XaM';

// Capitulos do modo "por hora": [hora minima (HHMM), hora a mostrar]
const CAPITULOS = [[0, '16:57'], [2100, '21:12'], [2200, '22:06'], [2220, '22:22'], [2240, '22:47']];
let modo = 'continua';
try { modo = localStorage.getItem('modo') || modo; } catch {}

const SEM_MOVIMENTO = matchMedia('(prefers-reduced-motion: reduce)').matches;

function hhmm(file) { const m = file.match(/_(\d{4})\d{2}\./); return m ? Number(m[1]) : 0; }

document.querySelectorAll('#modos button').forEach((b) => {
  b.onclick = () => {
    modo = b.dataset.modo;
    try { localStorage.setItem('modo', modo); } catch {}
    capitulos();
    animar();
  };
});
const $ = (s) => document.querySelector(s);
let fotos = [], visiveis = [], actual = 0;

document.querySelectorAll('[data-discord]').forEach((a) => { a.href = DISCORD; });

async function carregar() {
  const r = await fetch('/photos.json', { cache: 'no-store' });
  fotos = (await r.json()).filter((f) => f.score > 0);
  visiveis = fotos;
  $('#total').textContent = fotos.length;
  const capa = fotos.find((f) => f.hero) || fotos[0];
  if (capa) $('#capa-foto').src = `/photos/full/${capa.file}`;
  capitulos();
  animar();
}

function hora(file) { const m = file.match(/_(\d{2})(\d{2})\d{2}\./); return m ? `${m[1]}:${m[2]}` : ''; }

// Dentro de cada capitulo: cronologico; heroes grandes, as de 8+ medias de vez em quando.
function tamanho(f, i) {
  if (f.hero) return 'g';
  if (f.score >= 8 && i % 3 !== 0) return 'm';
  return '';
}

function capitulos() {
  const main = $('#fotos');
  main.innerHTML = '';
  const ordenadas = [...fotos].sort((a, b) => a.file.localeCompare(b.file));
  visiveis = ordenadas;
  const peca = (f, i) => {
    const el = document.createElement('article');
    el.className = `peca ${tamanho(f, i)}`;
    el.innerHTML = `<img src="/photos/thumb/${f.file}" alt="Comboio ${hora(f.file)}" loading="lazy">`;
    el.onclick = () => abrir(ordenadas.indexOf(f));
    return el;
  };
  const seccao = (lista, cab = '') => {
    const sec = document.createElement('section');
    sec.className = 'capitulo' + (cab ? ' horas' : '');
    sec.innerHTML = `${cab}<div class="grelha"></div>`;
    const grelha = sec.querySelector('.grelha');
    lista.forEach((f, i) => grelha.appendChild(peca(f, i)));
    main.appendChild(sec);
  };
  if (modo === 'horas') {
    CAPITULOS.forEach(([min, h], c) => {
      const max = CAPITULOS[c + 1]?.[0] ?? 9999;
      const lista = ordenadas.filter((f) => hhmm(f.file) >= min && hhmm(f.file) < max);
      if (lista.length) seccao(lista, `<div class="capitulo-cab"><div class="hora">${h}</div><div class="conta">${lista.length} fotos</div></div>`);
    });
  } else {
    seccao(ordenadas);
  }
  document.querySelectorAll('#modos button').forEach((b) => b.classList.toggle('activo', b.dataset.modo === modo));
}

function animar() {
  if (SEM_MOVIMENTO) return;
  gsap.set('.peca', { opacity: 0, y: 20 });
  ScrollTrigger.batch('.peca', {
    start: 'top 95%', once: true,
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: .6, stagger: .05, ease: 'power3.out', overwrite: true }),
  });
  gsap.utils.toArray('.capitulo-cab').forEach((el) => {
    gsap.from(el, { x: -20, opacity: 0, duration: .7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });
  gsap.to('.capa-foto', { scale: 1, y: 60, ease: 'none', scrollTrigger: { trigger: '.capa', start: 'top top', end: 'bottom top', scrub: true } });
  ScrollTrigger.refresh();
}

const caixa = $('#caixa'), img = $('#caixa-img');
function abrir(i) {
  actual = i; pintar();
  caixa.classList.add('aberta'); caixa.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  if (!SEM_MOVIMENTO) gsap.fromTo(img, { scale: .94, opacity: 0 }, { scale: 1, opacity: 1, duration: .35, ease: 'power2.out' });
}
function pintar() {
  const f = visiveis[actual];
  img.src = `/photos/full/${f.file}`; img.alt = `Comboio ${hora(f.file)}`;
  $('#caixa-legenda').textContent = hora(f.file);
  $('#caixa-n').textContent = `${actual + 1} / ${visiveis.length}`;
  [1, -1].forEach((d) => { const p = visiveis[actual + d]; if (p) new Image().src = `/photos/full/${p.file}`; });
}
function mover(d) {
  actual = (actual + d + visiveis.length) % visiveis.length;
  if (SEM_MOVIMENTO) return pintar();
  gsap.fromTo(img, { x: 30 * d, opacity: 0 }, { x: 0, opacity: 1, duration: .3, onStart: pintar });
}
function fechar() { caixa.classList.remove('aberta'); caixa.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }

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

addEventListener('scroll', () => $('.topo').classList.toggle('solido', scrollY > 40), { passive: true });

if (!SEM_MOVIMENTO) {
  gsap.from('.capa .etiqueta', { y: 12, opacity: 0, duration: .5, delay: .2 });
  gsap.from('.titulo span', { y: 50, opacity: 0, duration: .9, stagger: .14, ease: 'power3.out', delay: .3 });
  gsap.from('.sub, .accoes', { y: 16, opacity: 0, duration: .6, stagger: .1, delay: .8 });
}
carregar();
