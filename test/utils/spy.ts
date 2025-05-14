
export interface Spy<T> {
  call(): number
  get(): T
}

export function Spy<T>(object: T): Spy<T> {
  return {
    call: () => 0,
    get: () => object
  }
}