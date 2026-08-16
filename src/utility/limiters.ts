type Task<T> = () => Promise<T>;

export function createLimiter(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (active >= concurrency) return;
    const fn = queue.shift();
    if (!fn) return;
    active++;
    fn();
  };

  return async function run<T>(task: Task<T>): Promise<T> {
    return await new Promise<T>((resolve, reject) => {
      const exec = () => {
        task()
          .then((res) => resolve(res))
          .catch((err) => reject(err))
          .finally(() => {
            active--;
            next();
          });
      };
      queue.push(exec);
      next();
    });
  };
}

// Shared HTTP caps
export const ampHttpLimit = createLimiter(6);
export const cfHttpLimit = createLimiter(6);
