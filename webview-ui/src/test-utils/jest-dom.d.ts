import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

// vitest 5 では Assertion のジェネリクスが <R, T> に変更され、
// @testing-library/jest-dom 同梱の型拡張（<T>）と一致しないため、ここで拡張を定義する
declare module "vitest" {
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */
  interface Assertion<R extends void | Promise<void> = void, T = unknown>
    extends TestingLibraryMatchers<any, R> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<any, any> {}
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars */
}
