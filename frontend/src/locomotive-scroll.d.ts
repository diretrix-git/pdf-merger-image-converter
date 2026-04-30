declare module 'locomotive-scroll' {
  interface LocomotiveScrollOptions {
    el: HTMLElement
    smooth?: boolean
    multiplier?: number
    lerp?: number
    class?: string
    scrollbarClass?: string
    scrollingClass?: string
    draggingClass?: string
    smoothClass?: string
    initClass?: string
    getSpeed?: boolean
    getDirection?: boolean
    scrollFromAnywhere?: boolean
    tablet?: { smooth?: boolean; breakpoint?: number }
    smartphone?: { smooth?: boolean }
  }

  class LocomotiveScroll {
    constructor(options: LocomotiveScrollOptions)
    destroy(): void
    update(): void
    stop(): void
    start(): void
    scrollTo(target: string | HTMLElement | number, options?: object): void
    on(event: string, callback: (...args: unknown[]) => void): void
  }

  export default LocomotiveScroll
}
