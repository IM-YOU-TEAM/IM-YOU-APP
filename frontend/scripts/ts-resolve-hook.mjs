export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const source = new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url);
    return nextResolve(source.href, context);
  }
  const relative = specifier.startsWith('./') || specifier.startsWith('../');
  const hasExt = /\.[a-z]+$/i.test(specifier);
  if (relative && !hasExt) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
}
