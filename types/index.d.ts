export type SnowFill = number

declare module 'claude-code' {
  interface PluginState {
    'forest-winter': { fill: SnowFill; steps: number; busy: boolean; main: boolean; born: number; came: number; jobs: string[]; tapped: { side: number; at: number }; turned: number }
  }
}
