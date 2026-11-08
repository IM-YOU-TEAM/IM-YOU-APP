export async function resolve(specifier, context, nextResolve) {
  const relative = specifier.startsWith('./') || specifier.startsWith('../');
  const hasExt = /\.[a-z]+$/i.test(specifier);
  if (relative && !hasExt) return nextResolve(`${specifier}.ts`, context);
  return nextResolve(specifier, context);
}
