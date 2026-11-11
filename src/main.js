import './style.css';
import projects from 'virtual:gallery';

const gallery = document.querySelector('#galeria');
const status = document.querySelector('#status');
const retry = document.querySelector('#retry');
const viewer = document.querySelector('#viewer');
const files = projects.map(file => ({
  ...file,
  displayTitle: file.name.replace(/\.[^.]+$/, '').replace(/\d+/g, '').replace(/_/g, ' ').replace(/zumbi/gi, 'Zombie').replace(/\s+/g, ' ').trim() || 'Untitled'
}));
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
const title = file => file.displayTitle;

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
    hoverText.textContent = `See more about ${title(file)}`;
    icon.append(hoverText);
    icon.setAttribute('aria-hidden', 'true');
    imageWrap.append(img, icon);
    const caption = document.createElement('span');
    caption.className = 'artwork-caption';
    const label = document.createElement('span');
    label.className = 'artwork-title';
    label.textContent = title(file);
    caption.append(label);
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
    status.textContent = success ? (visible.length ? '' : 'No projects found.') : `${lastImageError || 'This image could not be loaded.'} Automatic loading is paused. Use the button to try again.`;
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
let galleryScrollY = 0;
let navigationFrame;
function positionGalleryNavigation() {
  cancelAnimationFrame(navigationFrame);
  if (!viewer.open) return;
  const images = [...viewer.querySelectorAll('#project-images img, #project-images video')];
  const centerY = viewer.clientHeight / 2;
  const image = images.reduce((closest, candidate) => {
    const bounds = candidate.getBoundingClientRect();
    const distance = Math.abs((bounds.top + bounds.bottom) / 2 - centerY);
    return !closest || distance < closest.distance ? { image: candidate, distance } : closest;
  }, null)?.image;
  if (!image) return;
  const bounds = image.getBoundingClientRect();
  const buttonHalfWidth = document.querySelector('#previous').offsetWidth / 2;
  const inset = buttonHalfWidth + 8;
  const expanded = image.closest('.project-image-zoom')?.classList.contains('is-expanded');
  if (!expanded) {
    image.dataset.previousX = bounds.left / 2;
    image.dataset.nextX = (bounds.right + viewer.clientWidth) / 2;
  }
  const previousX = Number(image.dataset.previousX ?? bounds.left / 2);
  const nextX = Number(image.dataset.nextX ?? (bounds.right + viewer.clientWidth) / 2);
  viewer.style.setProperty('--previous-x', `${Math.max(inset, Math.min(viewer.clientWidth - inset, previousX))}px`);
  viewer.style.setProperty('--next-x', `${Math.max(inset, Math.min(viewer.clientWidth - inset, nextX))}px`);
  if (image.getAnimations().length) navigationFrame = requestAnimationFrame(positionGalleryNavigation);
}
const imageSizeObserver = new ResizeObserver(positionGalleryNavigation);
const isVideo = url => /\.(mp4|webm|ogv|m4v)$/i.test(url);
function pauseVideos() {
  viewer.querySelectorAll('video').forEach(video => video.pause());
}
viewer.addEventListener('scroll', positionGalleryNavigation, { passive: true });
window.addEventListener('resize', positionGalleryNavigation);
async function openWork(index) {
  const opening = !viewer.open;
  const trigger = opening ? lastTrigger : null;
  currentIndex = (index + visible.length) % visible.length;
  const file = visible[currentIndex];
  const requestId = ++viewerRequest;
  const firstImage = new Image();
  firstImage.src = isVideo(file.images[0]) ? file.localURL : file.images[0];
  if (trigger) {
    trigger.dataset.openRequest = String(requestId);
    trigger.classList.add('is-opening');
    trigger.setAttribute('aria-busy', 'true');
  }
  try {
    await firstImage.decode();
  } catch {
    // Keep the viewer accessible even when the image cannot be decoded.
  } finally {
    if (trigger?.dataset.openRequest === String(requestId)) {
      trigger.classList.remove('is-opening');
      trigger.removeAttribute('aria-busy');
      delete trigger.dataset.openRequest;
    }
  }
  if (requestId !== viewerRequest) return;
  const thumbnailBounds = trigger?.querySelector('img')?.getBoundingClientRect();
  const container = document.querySelector('#project-images');
  imageSizeObserver.disconnect();
  pauseVideos();
  container.replaceChildren();
  document.querySelector('#viewer-title').textContent = title(file);
  document.querySelector('#viewer-counter').textContent = String(currentIndex + 1).padStart(2, '0') + ' / ' + String(visible.length).padStart(2, '0');
  for (const [index, url] of file.images.entries()) {
    if (isVideo(url)) {
      const video = document.createElement('video');
      video.muted = true;
      video.defaultMuted = true;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'metadata';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'project-video';
      const indicator = document.createElement('span');
      indicator.className = 'video-play-indicator';
      indicator.textContent = '▶';
      indicator.setAttribute('aria-hidden', 'true');
      const updatePlayback = () => {
        button.classList.toggle('is-paused', video.paused);
        button.setAttribute('aria-label', `${video.paused ? 'Play' : 'Pause'} video: ${title(file)}`);
      };
      const play = () => video.play().catch(updatePlayback);
      video.addEventListener('play', updatePlayback);
      video.addEventListener('pause', updatePlayback);
      video.addEventListener('loadedmetadata', positionGalleryNavigation);
      video.addEventListener('error', () => {
        indicator.textContent = 'Video could not be loaded';
        button.classList.add('has-error');
      });
      button.addEventListener('click', event => {
        if (event.target !== video && event.detail !== 0) return;
        event.stopPropagation();
        if (video.paused) play();
        else video.pause();
      });
      updatePlayback();
      button.append(video, indicator);
      container.append(button);
      imageSizeObserver.observe(video);
      video.src = url;
      continue;
    }
    const image = index === 0 ? firstImage : document.createElement('img');
    image.alt = title(file) + ' — image ' + (index + 1);
    image.loading = index === 0 ? 'eager' : 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => { if (requestId === viewerRequest) image.alt = 'This image could not be loaded.'; });
    const zoomButton = document.createElement('button');
    zoomButton.type = 'button';
    zoomButton.className = 'project-image-zoom';
    image.addEventListener('load', () => {
      zoomButton.classList.toggle('is-portrait', image.naturalHeight >= image.naturalWidth * 1.3);
      positionGalleryNavigation();
    });
    if (index !== 0) image.src = url;
    if (image.complete && image.naturalWidth) {
      zoomButton.classList.toggle('is-portrait', image.naturalHeight >= image.naturalWidth * 1.3);
    }
    zoomButton.setAttribute('aria-label', 'Enlarge image');
    zoomButton.setAttribute('aria-pressed', 'false');
    zoomButton.addEventListener('click', event => {
      // Keep keyboard activation accessible; pointer zoom belongs to the image only.
      if (event.target !== image && event.detail !== 0) return;
      event.stopPropagation();
      const previousSize = image.getBoundingClientRect();
      image.getAnimations().forEach(animation => animation.cancel());
      const expanded = zoomButton.classList.toggle('is-expanded');
      zoomButton.setAttribute('aria-pressed', String(expanded));
      zoomButton.setAttribute('aria-label', expanded ? 'Fit image to screen' : 'Enlarge image');
      const nextSize = image.getBoundingClientRect();
      if (previousSize.width && nextSize.width && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        image.animate([
          { transform: `scale(${previousSize.width / nextSize.width}, ${previousSize.height / nextSize.height})` },
          { transform: 'scale(1)' }
        ], { duration: 400, easing: 'cubic-bezier(.22,.7,.25,1)' });
      }
      positionGalleryNavigation();
    });
    zoomButton.append(image);
    container.append(zoomButton);
    imageSizeObserver.observe(image);
  }
  if (!viewer.open) {
    galleryScrollY = window.scrollY;
    viewer.showModal();
  }
  viewer.scrollTop = 0;
  viewer.querySelectorAll('video').forEach(video => video.play().catch(() => {}));
  positionGalleryNavigation();
  if (thumbnailBounds?.width && firstImage.naturalWidth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const destination = firstImage.getBoundingClientRect();
    if (destination.width) {
      firstImage.animate([
        {
          transformOrigin: 'top left',
          transform: `translate(${thumbnailBounds.left - destination.left}px, ${thumbnailBounds.top - destination.top}px) scale(${thumbnailBounds.width / destination.width})`,
          opacity: 0.4
        },
        { transformOrigin: 'top left', transform: 'translate(0, 0) scale(1)', opacity: 1 }
      ], { duration: 450, easing: 'cubic-bezier(.22,.7,.25,1)' });
      positionGalleryNavigation();
    }
  }
}

document.querySelector('#close-viewer').addEventListener('click', () => viewer.close());
document.querySelector('#previous').addEventListener('click', () => openWork(currentIndex - 1));
document.querySelector('#next').addEventListener('click', () => openWork(currentIndex + 1));
viewer.addEventListener('click', event => {
  if (event.target.closest('img, video, figcaption, .viewer-toolbar, .gallery-nav')) return;
  viewer.close();
});
viewer.addEventListener('close', () => {
  pauseVideos();
  viewerRequest++;
  lastTrigger?.focus({ preventScroll: true });
  window.scrollTo({ top: galleryScrollY, behavior: 'instant' });
});
retry.addEventListener('click', load);
document.querySelector('#year').textContent = new Date().getFullYear();
load();
