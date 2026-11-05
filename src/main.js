import './style.css';
import projects from 'virtual:gallery';

const gallery = document.querySelector('#galeria');
const status = document.querySelector('#status');
const retry = document.querySelector('#retry');
const viewer = document.querySelector('#viewer');
const files = projects;
let visible = [];
let currentIndex = 0;
let lastTrigger;
const pageSize = 3;
let displayLimit = 3;
let batchLoading = false;
let autoLoadEnabled = true;
let lastImageError = '';
const loadMore = document.createElement('button');
loadMore.className = 'text-button load-more';
loadMore.textContent = 'Load more projects ↓';
loadMore.hidden = true;
gallery.after(loadMore);
const category = file => /sasuke|gardevoir|heather/i.test(file.name) ? 'fanart' : 'original';
const categoryName = file => category(file) === 'fanart' ? 'Fan art' : 'Original character';
const title = file => file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').replace(/zumbi/gi, 'Zombie').trim();

async function imageURL(file) { return file.localURL; }

async function loadCard(button, file) {
    const img = button.querySelector('img');
    try {
      img.src = await imageURL(file);
      await img.decode();
      button.style.setProperty('--image-ratio', img.naturalWidth / img.naturalHeight);
      button.classList.remove('is-loading');
      button.setAttribute('aria-busy', 'false');
      return true;
    } catch (error) {
      lastImageError = 'This image could not be loaded.';
      button.classList.remove('is-loading');
      button.setAttribute('aria-busy', 'false');
      button.classList.add('failed');
      const message = document.createElement('span');
      message.className = 'image-error';
      message.textContent = 'This image could not be loaded. Please try again.';
      button.querySelector('.artwork-image').append(message);
      return false;
    }
}
async function render(append = false) {
  if (batchLoading) return;
  lastImageError = '';
  status.classList.toggle('initial-loading', !append);
  status.textContent = append ? '' : 'Loading projects…';
  visible = files;
  const start = append ? gallery.children.length : 0;
  const pending = [];
  {
    batchLoading = true;
    loadMore.disabled = true;
    loadMore.setAttribute('aria-busy', 'true');
    gallery.setAttribute('aria-busy', 'true');
  }
  if (!append) gallery.replaceChildren();
  visible.slice(start, displayLimit).forEach((file, offset) => {
    const index = start + offset;
    const button = document.createElement('button');
    button.className = 'artwork is-loading';
    if (append) {
      button.classList.add('artwork-enter');
      button.style.setProperty('--enter-delay', `${offset * 70}ms`);
      button.addEventListener('animationend', () => button.classList.remove('artwork-enter'), { once: true });
    }
    button.setAttribute('aria-busy', 'true');
    button.dataset.id = file.id;
    button.setAttribute('aria-label', `View ${title(file)}`);
    const imageWrap = document.createElement('span');
    imageWrap.className = 'artwork-image';
    const img = document.createElement('img');
    img.alt = title(file);
    img.decoding = 'async';
    img.loading = 'eager';
    const icon = document.createElement('span');
    icon.className = 'thumb-overlay';
    const hoverText = document.createElement('span');
    hoverText.textContent = `See more about ${file.name.replace(/\.[^.]+$/, '')}`;
    icon.append(hoverText);
    icon.setAttribute('aria-hidden', 'true');
    imageWrap.append(img, icon);
    const caption = document.createElement('span');
    caption.className = 'artwork-caption';
    const label = document.createElement('span');
    label.className = 'artwork-title';
    label.textContent = title(file);
    const type = document.createElement('span');
    type.className = 'artwork-category';
    type.textContent = categoryName(file);
    caption.append(label, type);
    button.append(imageWrap, caption);
    button.addEventListener('click', () => { lastTrigger = button; openWork(index); });
    pending.push({ button, file });
  });
  {
    const results = await Promise.all(pending.map(({ button, file }) => loadCard(button, file)));
    const success = results.every(Boolean);
    autoLoadEnabled = success;
    if (success) gallery.append(...pending.map(item => item.button));
    else displayLimit = start;
    batchLoading = false;
    status.classList.remove('initial-loading');
    gallery.setAttribute('aria-busy', 'false');
    loadMore.disabled = false;
    loadMore.removeAttribute('aria-busy');
    loadMore.textContent = success ? 'Load more projects ↓' : 'Try loading images again ↻';
    status.textContent = success ? (visible.length ? '' : 'No projects in this category.') : `${lastImageError || 'This image could not be loaded.'} Automatic loading is paused. Use the button to try again.`;
    loadMore.hidden = gallery.children.length >= visible.length;
    return;
  }
}
loadMore.addEventListener('click', () => { if (batchLoading) return; displayLimit += pageSize; render(true); });

// Reveal the next batch only when scrolling down near the gallery's end.
let previousScrollY = window.scrollY;
let scrollScheduled = false;
window.addEventListener('scroll', () => {
  if (scrollScheduled) return;
  scrollScheduled = true;
  requestAnimationFrame(() => {
    const scrollingDown = window.scrollY > previousScrollY;
    previousScrollY = window.scrollY;
    scrollScheduled = false;
    if (!scrollingDown || !autoLoadEnabled || batchLoading || loadMore.hidden || viewer.open) return;
    const bounds = loadMore.getBoundingClientRect();
    if (bounds.top <= window.innerHeight + 180 && bounds.bottom >= 0) {
      displayLimit += pageSize;
      render(true);
    }
  });
}, { passive: true });

async function load() {
  retry.hidden = true;
  await render();
}

let viewerRequest = 0;
async function openWork(index) {
  currentIndex = (index + visible.length) % visible.length;
  const file = visible[currentIndex];
  const requestId = ++viewerRequest;
  const container = document.querySelector('#project-images');
  container.replaceChildren();
  document.querySelector('#viewer-title').textContent = title(file);
  document.querySelector('#viewer-category').textContent = categoryName(file);
  document.querySelector('#viewer-counter').textContent = String(currentIndex + 1).padStart(2, '0') + ' / ' + String(visible.length).padStart(2, '0');
  const originalLink = document.querySelector('#original-link');
  originalLink.href = file.localURL;
  for (const [index, url] of file.images.entries()) {
    const image = document.createElement('img');
    image.alt = title(file) + ' — image ' + (index + 1);
    image.loading = index === 0 ? 'eager' : 'lazy';
    image.decoding = 'async';
    image.src = url;
    image.addEventListener('error', () => { if (requestId === viewerRequest) image.alt = 'This image could not be loaded.'; });
    const zoomButton = document.createElement('button');
    zoomButton.type = 'button';
    zoomButton.className = 'project-image-zoom';
    zoomButton.setAttribute('aria-label', 'Enlarge image to 100%');
    zoomButton.setAttribute('aria-pressed', 'false');
    zoomButton.addEventListener('click', () => {
      const expanded = zoomButton.classList.toggle('is-expanded');
      zoomButton.setAttribute('aria-pressed', String(expanded));
      zoomButton.setAttribute('aria-label', expanded ? 'Reduce image to 80%' : 'Enlarge image to 100%');
    });
    zoomButton.append(image);
    container.append(zoomButton);
  }
  if (!viewer.open) viewer.showModal();
  viewer.scrollTop = 0;
}

document.querySelector('#close-viewer').addEventListener('click', () => viewer.close());
viewer.addEventListener('close', () => { viewerRequest++; lastTrigger?.focus({ preventScroll: true }); });
document.querySelector('#previous').addEventListener('click', () => openWork(currentIndex - 1));
document.querySelector('#next').addEventListener('click', () => openWork(currentIndex + 1));
viewer.addEventListener('keydown', event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); openWork(currentIndex + (event.key === 'ArrowLeft' ? -1 : 1)); } });
retry.addEventListener('click', load);
document.querySelector('#year').textContent = new Date().getFullYear();
load();
