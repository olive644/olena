// Indicador de composição, não estimativa de entropia ou consulta a terceiros.
export function passwordChecks(value: string): boolean[] {
  return [
    [...value].length >= 12,
    /\p{Lu}/u.test(value),
    /\p{Ll}/u.test(value),
    /\p{N}/u.test(value),
    /[^\p{L}\p{N}\s]/u.test(value),
  ];
}

// Heurística local de orientação. Não detecta senhas vazadas nem garante segurança.
export function passwordStrength(value: string): number {
  if (!value || /^(.)\1+$/u.test(value) || /password|senha|123456|qwerty/i.test(value)) return 0;
  const satisfied = passwordChecks(value).filter(Boolean).length;
  return satisfied < 5 ? 1 : [...value].length < 16 ? 2 : 3;
}
