// Copies the MediaPipe WASM runtime out of node_modules so the web app can load it
// from /mediapipe/wasm. The files stay out of git; npm install runs this.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = join(root, 'node_modules/@mediapipe/tasks-vision');
const wasmFrom = join(pkg, 'wasm');
const wasmTo = join(root, 'public/mediapipe/wasm');
const bundleFrom = join(pkg, 'vision_bundle.mjs');
const bundleTo = join(root, 'public/mediapipe/vision_bundle.mjs');

if (!existsSync(wasmFrom) || !existsSync(bundleFrom)) {
  console.warn('MediaPipe is not installed yet; skipping the pose runtime copy.');
  process.exit(0);
}

mkdirSync(wasmTo, { recursive: true });
cpSync(wasmFrom, wasmTo, { recursive: true });
cpSync(bundleFrom, bundleTo);
