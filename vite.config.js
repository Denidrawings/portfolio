import { defineConfig } from 'vite';
import { readdirSync, existsSync } from 'node:fs';
import { resolve, extname, basename, join, relative } from 'node:path';

const imagePattern = /\.(png|jpe?g|webp|avif|gif)$/i;
const sortNames = (a, b) => a.localeCompare(b, 'pt-BR', { numeric: true });
const root = resolve('public/gallery');
function imageFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isFile() && imagePattern.test(entry.name)).map(entry => entry.name).sort(sortNames);
}
const base = process.env.GITHUB_ACTIONS === 'true' ? '/portifolio/' : '/';
const url = (...parts) => base + 'gallery/' + parts.map(encodeURIComponent).join('/');
function projects() {
  return imageFiles(root).map(name => {
    const id = basename(name, extname(name));
    const images = imageFiles(join(root, id)).map(image => url(id, image));
    return { id, name, localURL: url(name), images: images.length ? images : [url(name)] };
  });
}
export default defineConfig({
  base,
  plugins: [{
    name: 'local-gallery',
    resolveId(id) { if (id === 'virtual:gallery') return '\0virtual:gallery'; },
    load(id) { if (id === '\0virtual:gallery') return `export default ${JSON.stringify(projects())}`; },
    configureServer(server) {
      server.watcher.add(root);
      const refresh = path => {
        const relativePath = relative(root, resolve(path));
        if (relativePath.startsWith('..') || !relativePath) return;
        const module = server.moduleGraph.getModuleById('\0virtual:gallery');
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh).on('unlink', refresh).on('change', refresh);
    },
  }],
});
