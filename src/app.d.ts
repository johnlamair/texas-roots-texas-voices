// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface Platform {}
  }
}

declare module '*.md' {
  const Component: import('svelte').ComponentType;
  export default Component;
  export const metadata: Record<string, unknown>;
}

declare module '*.yaml' {
  const data: unknown;
  export default data;
}

export {};
