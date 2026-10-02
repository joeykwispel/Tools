import { evaluate, type Input, type Output } from './logic';

/**
 * Runs the pattern off the main thread. A pattern that backtracks forever can then be stopped by ending the worker,
 * instead of freezing the tab.
 */
export interface Request extends Input {
  id: number;
}

export interface Response {
  id: number;
  output: Output;
}

self.onmessage = (e: MessageEvent<Request>) => {
  const { id, ...input } = e.data;
  self.postMessage({ id, output: evaluate(input) } satisfies Response);
};
