export default class LocalStorageUnit<T> {
  constructor(
    public key: string,
    public defaultValue: T,
  ) {}

  get(): T {
    const raw = localStorage.getItem(this.key);

    if (raw === null) {
      return this.defaultValue;
    }

    return JSON.parse(raw);
  }

  set(value: T) {
    if (value === undefined) {
      if (this.defaultValue !== undefined) {
        throw new Error('undefined can only be set if it\'s the default');
      }

      this.clear();
    } else {
      localStorage.setItem(this.key, JSON.stringify(value));
    }
  }

  clear() {
    localStorage.removeItem(this.key);
  }
}
