export const randomInt = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min + 1));
export function mathQuestion() {
  const type = randomInt(0, 3);
  const a = randomInt(24, 89),
    b = randomInt(13, 68);
  if (type === 0) return { prompt: `${a} + ${b}`, answer: a + b };
  if (type === 1)
    return { prompt: `${Math.max(a, b)} − ${Math.min(a, b)}`, answer: Math.abs(a - b) };
  const x = randomInt(12, 24),
    y = randomInt(3, 9);
  if (type === 2) return { prompt: `${x} × ${y}`, answer: x * y };
  return { prompt: `${x * y} ÷ ${y}`, answer: x };
}
export function digits(length: number) {
  return Array.from({ length }, () => randomInt(0, 9)).join('');
}
export const colors = [
  { key: 'r', name: 'RED', label: '红色', className: 'color-red' },
  { key: 'g', name: 'GREEN', label: '绿色', className: 'color-green' },
  { key: 'b', name: 'BLUE', label: '蓝色', className: 'color-blue' },
  { key: 'y', name: 'YELLOW', label: '黄色', className: 'color-yellow' },
] as const;
export function stroopQuestion() {
  const ink = randomInt(0, 3);
  const word = Math.random() < 0.8 ? (ink + randomInt(1, 3)) % 4 : ink;
  return { ink: colors[ink], word: colors[word].name };
}
