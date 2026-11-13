import { randomInt } from './generators';

export const directions = [
  { key: 'ArrowUp', label: '上', glyph: '↑', row: 1, column: 2 },
  { key: 'ArrowRight', label: '右', glyph: '→', row: 2, column: 3 },
  { key: 'ArrowDown', label: '下', glyph: '↓', row: 3, column: 2 },
  { key: 'ArrowLeft', label: '左', glyph: '←', row: 2, column: 1 },
] as const;
export function directionPrompt(index: number) {
  const pointing = randomInt(0, 3);
  const location = (pointing + randomInt(1, 3)) % 4;
  const rule = Math.floor(index / 4) % 2 === 0 ? 'pointing' : 'location';
  return { pointing, location, rule, correct: rule === 'pointing' ? pointing : location };
}
const pairs = [
  ['6', '9'],
  ['E', 'F'],
  ['P', 'R'],
  ['b', 'd'],
  ['3', '8'],
] as const;
export function searchPrompt() {
  const [base, odd] = pairs[randomInt(0, pairs.length - 1)];
  return { base, odd, target: randomInt(0, 8) };
}
