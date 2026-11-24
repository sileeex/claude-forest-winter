export type SnowFill = number

declare module 'claude-code' {
  interface PluginState {
    'forest-winter': { fill: SnowFill; steps: number; busy: boolean; main: boolean; born: number; turned: number }
  }
}
