// Lets `node` run the pose metric check, which uses extensionless TypeScript imports.
import { register } from 'node:module';

register(new URL('./ts-resolve-hook.mjs', import.meta.url));
