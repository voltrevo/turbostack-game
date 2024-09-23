import { EventEmitter } from "ee-typed";
import { useEffect, useState } from "react";

export default class Cell<T> extends EventEmitter<{ change(): void }> {
  constructor(private value: T) {
    super();
  }

  get() {
    return this.value;
  }

  set(value: T) {
    this.value = value;
    this.emit('change');
  }

  use(): T {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState(this.value);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const changeHandler = () => setValue(this.value);
      this.on('change', changeHandler);
      return () => { this.off('change', changeHandler); };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [this]);

    return value;
  }
}
