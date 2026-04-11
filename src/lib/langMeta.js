// src/lib/langMeta.js — Language file extension + filename helpers

export const LANG_EXT = {
  JavaScript:'js', TypeScript:'ts', Python:'py', PHP:'php',
  Go:'go', Rust:'rs', CSS:'css', HTML:'html', Sass:'scss',
  Shell:'sh', Bash:'sh', SQL:'sql', Ruby:'rb',
  C:'c', 'C++':'cpp', 'C#':'cs', Java:'java',
  Kotlin:'kt', Swift:'swift', Dart:'dart', Lua:'lua',
  JSON:'json', YAML:'yaml', TOML:'toml', XML:'xml',
  Markdown:'md', Dockerfile:'dockerfile', Nginx:'conf',
  PowerShell:'ps1', R:'r', GraphQL:'graphql',
  Solidity:'sol', Haskell:'hs', Elixir:'ex',
  Terraform:'tf', Groovy:'groovy', Scala:'scala',
  Perl:'pl', Clojure:'clj', Erlang:'erl',
  Zig:'zig', Nim:'nim', Assembly:'asm', Crystal:'cr',
  Vue:'vue', React:'jsx', Svelte:'svelte',
  Julia:'jl', MATLAB:'m', Prolog:'pl',
  Prisma:'prisma', Proto:'proto', Kubernetes:'yaml',
};

export function getExt(language) {
  return LANG_EXT[language] ?? 'txt';
}

export function getSafeName(title) {
  const s = (title ?? 'snippet')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return s || 'snippet';
}
