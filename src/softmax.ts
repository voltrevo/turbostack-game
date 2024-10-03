export default function softmax(x: number[], temperature = 1): number[] {
  const max = Math.max(...x);
  const e = x.map((v) => Math.exp((v - max) / temperature));
  const sum = e.reduce((a, b) => a + b);
  return e.map((v) => v / sum);
}
