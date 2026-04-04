/// <reference types="vite/client" />

declare module 'animejs' {
  interface AnimeParams {
    targets?: unknown;
    [key: string]: unknown;
  }
  function anime(params: AnimeParams): { finished: Promise<void> };
  namespace anime {
    function stagger(value: number, options?: { start?: number }): (el: Element, i: number, len: number) => number;
  }
  export default anime;
}
