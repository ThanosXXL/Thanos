// Statisches 3D-Hochglanz-Logo (ohne App-Abhängigkeiten, z. B. für das öffentliche Formular).
import { h } from './core.js';

export function logo3dStatic(src) {
  return h('div.logo3d', h('div.logo3d-inner', h('img', { src, alt: 'IT - World · IT Solutions', draggable: 'false' }), h('span.logo3d-shine'), h('span.logo3d-glare')));
}
