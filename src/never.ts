export default function never(x: never): never {
  throw new Error(`Unexpected: ${x}`);
}