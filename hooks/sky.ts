import { clamp, composer, exp, max, mix, picture, px, shader, sin, size, smoothstep, step, time, values, vec3, vec4 } from 'claude-code/shader'

// What the mod sets: whether the aurora shows tonight (0 for none) and how
// much snow lies on the message box (the fill of the context).
const set = values({ aurora: [0, 1], snow: [0, 1] })

// Kept as cheap as it can be: the app draws the whole scene less sharply when
// a shader costs too much, so every sine here is one the picture pays for.
const sky = picture(p => {
  const x = (p.uv.x * size.x) / size.y
  const y = p.uv.y

  // A far aurora, as seen low over the horizon on a northern night: one thin
  // green arc with fine uneven rays rising from it, shimmering along it.
  const mid = size.x / size.y / 2
  const hem = 0.74 - 0.05 * (x - mid) * (x - mid) + 0.022 * sin(x * 1.3 + time * 0.06)
  const up = y - hem
  const wander = sin(x * 2.6 + time * 0.25)
  const rays = (0.5 + 0.5 * sin(x * 67 + 3 * wander + time * 0.5)) * (0.55 + 0.45 * sin(x * 21 - time * 0.2))
  const swell = 0.35 + 0.65 * smoothstep(-0.6, 0.7, sin(x * 0.9 + time * 0.05 + wander))
  const light = smoothstep(-0.006, 0.003, up) * exp(-max(up, 0) * (20 + 30 * (1 - rays * swell)))
  const lit = clamp(light * (0.55 + 0.45 * rays) * swell * 0.95, 0, 0.82) * set.aurora
  const hue = vec3(mix(vec3(0.2, 0.9, 0.5), vec3(0.72, 1, 0.82), clamp(lit * 1.3, 0, 1)))

  // Snow lying along the top edge of the message box, deeper as the context fills.
  const wide = max(composer.z - composer.x, 0.0001)
  const along = (p.uv.x - composer.x) / wide
  const ends = smoothstep(0, 0.035, along) * smoothstep(1, 0.965, along) * step(0.02, wide)
  const depth = (0.0035 + 0.02 * set.snow) * (0.66 + 0.34 * sin(along * 43 + 0.7)) * ends
  const over = p.uv.y - composer.w
  const edge = (px * 1.5) / size.y
  const pile = smoothstep(depth, depth - edge, over) * smoothstep(-edge, 0, over) * step(0.0001, depth)
  const white = vec3(mix(vec3(0.74, 0.77, 0.82), vec3(0.94, 0.95, 0.97), clamp(over / max(depth, 0.0001), 0, 1)))

  return vec4(vec3(hue * lit * (1 - pile) + white * pile), lit * (1 - pile) + pile)
})

export default shader({ fps: 30, passes: [sky] })
