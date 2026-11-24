import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { auroraAt, simple } from './scene'

// Fill of the context window, 0 to 100, in steps of 2: the snow on the pines.
const fill = atom({ plugin: 'forest-winter', key: 'fill' } as const, 0)

// Near-black with near-white text; no veil and no blur over the scene.
const { theme } = makeColors({
  label: 'Forest Winter',
  only: 'dark',
  roles: { accent: '#4f93cf', danger: '#d2574a', success: '#4f9e6c', warning: '#c9923a', pro: '#8a6fd0' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#070707',
        'surface-1': '#0c0c0c',
        'surface-2': '#131313',
        'surface-3': '#171717',
        'text-primary': '#f3f4f5',
        'text-secondary': '#cfd1d4',
        'text-muted': '#9c9fa5',
      },
    },
  },
})

// True while the campfire burns: Claude is working, or an agent of its is.
const busy = atom({ plugin: 'forest-winter', key: 'busy' } as const, false)

// When the fire last changed, lit or left to die (epoch ms).
const turned = atom({ plugin: 'forest-winter', key: 'turned' } as const, 0)

// True while the main conversation's own turn runs.
const main = atom({ plugin: 'forest-winter', key: 'main' } as const, false)

// Messages sent in this conversation: the footprints across the snow.
const steps = atom({ plugin: 'forest-winter', key: 'steps' } as const, 0)

// The app's panels (the message box's surround, the list of chats) are let
// almost clear, with no blur, so the snow runs on under them.
const BASE: ThemeSetArgs = { colors: theme, backdrop: { scene: 'forest-winter', glass: { blur: 0, tint: '#070707', opacity: 0.12 } } }
const PLAIN: ThemeSetArgs = { colors: theme, backdrop: { scene: 'forest-winter', glass: false } }

const LOOK: ThemeSetArgs = {
  ...BASE,
  style: {
    UserMessage: { backgroundColor: 'surface-2', radius: 16, paddingX: 14, paddingY: 10 },
    AssistantMessage: { backgroundColor: 'surface-0', radius: 16, paddingX: 16, paddingY: 12 },
    ToolUse: { backgroundColor: 'surface-1', radius: 10, paddingX: 8 },
  },
}

async function setLook($: EngineInterface) {
  try {
    return await $.theme.set(LOOK)
  } catch (error) {
    $.ui.log(String(error))
    try {
      return await $.theme.set(BASE)
    } catch {
      return $.theme.set(PLAIN)
    }
  }
}

// Lights the fire or leaves it to die, noting when, and only when that changes.
async function kindle($: EngineInterface, lit: boolean) {
  if ((await read($, busy)) === lit) {
    return
  }
  const when = await $.clock.now()
  await update($, turned, () => when)
  await update($, busy, () => lit)
}

// Whether an agent other than `except` is still at work in the background.
async function agentsAtWork($: EngineInterface, except?: string) {
  try {
    const agents = await $.agent.list()
    return agents.some(a => a.id !== except && (a.status === 'running' || a.status === 'pending' || a.status === 'waiting'))
  } catch {
    return false
  }
}

// The fire burns while the main turn runs or any agent is still working.
async function tend($: EngineInterface, ended?: string) {
  await kindle($, (await read($, main)) || (await agentsAtWork($, ended)))
}

export const register: Register = (on, options) => {
  // The effects option: 'shader' plays the aurora and the snow on the message
  // box on the GPU; 'drawing' keeps to the drawing alone, lighter on a laptop.
  const useShader = options.effects === 'shader'

  on('session.start', async ($, e, next) => {
    await setLook($)
    const { context } = await $.session.usage()
    await update($, fill, () => Math.round((context.percent ?? 0) / 2) * 2)

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await update($, steps, count => count + 1)
    await update($, main, () => true)
    await kindle($, true)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await update($, main, () => false)
    }
    await tend($, e.agentId)

    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    await kindle($, true)

    return next(e)
  })

  on('agent.report', async ($, e, next) => {
    await tend($, e.agentId)

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('context')) {
      const p = Math.round((e.context.percent ?? 0) / 2) * 2
      await update($, fill, old => (old === p ? old : p))
      $.ui.status(`❄ snow ${p}%`)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== 'forest-winter') {
      return next(e)
    }
    const { Shader, Svg } = $.ui.resolve(e)
    // Everything the drawing needs is asked for at once, so a chat that is
    // switched to gets its scene as soon as it can.
    const [p, now, since, walked, lit] = await Promise.all([read($, fill), $.clock.now(), read($, turned), read($, steps), read($, busy)])
    // The dark band behind the list of chats is for the desktop app alone.
    const source = simple(p, now, walked, lit, false, since === 0 ? 999 : (now - since) / 1000, e.surface === 'desktop')
    const alt = `Snowy pines in the corners at night, snow at ${p}%`
    if (!useShader) {
      return <Svg source={source} alt={alt} isInteractive />
    }

    // The shader lays the aurora and the snow on the message box over the
    // drawing; where no shader plays, the drawing stands alone.
    return (
      <Shader module="./sky.ts" values={{ aurora: auroraAt(now), snow: p / 100 }}>
        <Svg source={source} alt={alt} isInteractive />
      </Shader>
    )
  })
}
