import { ATLAS } from './stars'
import type { Constellation } from './stars'

// The winter scene, drawn as one SVG string from the time, how full the
// context is, and what Claude is doing.

const W = 1600
const H = 1000
const RAD = Math.PI / 180

// How far the moon is through its month at `ms` (epoch, UTC): 0 new, 0.5 full.
function moonAge(ms: number): number {
  const age = (((ms - 947182440000) / 86400000) % 29.530588 + 29.530588) % 29.530588
  return age / 29.530588
}

function hash(v: number): number {
  let x = (v ^ 0x9e3779b9) >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296
}

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const R = Math.round
const clamp = (v: number) => Math.min(1, Math.max(0, v))

// A pine, tier by tier from the tip down, in flat crisp colors: boughs with
// scalloped, drooping edges, and on each tier a pad of snow with a lumpy
// lower edge and a thin shadow beneath it. Nothing shaded or blurred.
function pine(x: number, base: number, h: number, w: number, tiers: number, body: string, snow: string, cap: number, lean: number) {
  const n = tiers + 2
  const r1 = (v: number) => (h >= 300 ? R(v) : R(v * 10) / 10)
  const q = rng(R(x * 7 + h * 13))
  let boughs = `M${r1(x - w * 0.028)} ${R(base)}V${R(base - h * 0.16)}h${r1(w * 0.056)}V${R(base)}Z`
  let pads = ''
  for (let i = 0; i < n; i++) {
    const top = base - h + (i * h * 0.9) / n
    const bot = top + (h * 1.75) / n
    const tw = (w * (0.2 + (0.8 * (i + 1)) / n)) / 2
    const m = 2 + Math.floor(i / 2)
    const dr = (bot - top) * 0.2
    const sy = top + (bot - top) * 0.62
    let d = `M${r1(x)} ${r1(top)}Q${r1(x - tw * 0.35)} ${r1(sy)} ${r1(x - tw)} ${r1(bot)}`
    // Dark twig tips poking out below the boughs, never two alike.
    const e = (tw / m) * 0.11
    let tips = ''
    for (let j = 0; j <= m; j++) {
      const inner = j > 0 && j < m
      const tx = x - tw + (j * 2 * tw) / m + (inner ? (q() - 0.5) * (tw / m) * 0.5 : 0)
      const ty = inner ? bot - dr * (0.05 + 0.5 * q()) : bot
      if (j > 0) d += `Q${r1(tx - tw / m)} ${r1(bot - dr * (1.3 + 0.8 * q()))} ${r1(tx)} ${r1(ty)}`
      const out = (tx < x ? -1 : 1) * e * (0.6 + 1.2 * q())
      const long = dr * (0.12 + 0.3 * q())
      tips += `M${r1(tx - e)} ${r1(ty - dr * 0.35)}L${r1(tx + out)} ${r1(ty + long)}L${r1(tx + e)} ${r1(ty - dr * 0.35)}Z`
    }
    boughs += `${d}Q${r1(x + tw * 0.35)} ${r1(sy)} ${r1(x)} ${r1(top)}Z${tips}`
    // Snow: each bough holds its own load, and a few are almost bare.
    const load = () => (i > 0 && q() < 0.2 ? 0.3 : 0.75 + 0.6 * q())
    const fr = Math.min(0.78, cap * (1 + lean) * (i === 0 ? 1.1 : load()))
    const fl = Math.min(0.78, cap * (1 - lean) * (i === 0 ? 1.1 : load()))
    const px = x + tw * fr * 0.9
    const py = top + (bot - top) * fr
    const lx = x - tw * fl * 0.9
    const ly = top + (bot - top) * fl
    pads += `M${r1(x)} ${r1(top)}Q${r1(x + (px - x) * 0.3)} ${r1(top + (py - top) * 0.6)} ${r1(px)} ${r1(py)}Q${r1(x + (px - x) * 0.6)} ${r1(py + dr * 0.9)} ${r1(x + (px - x) * 0.18)} ${r1(py - dr * 0.25)}Q${r1(x)} ${r1((py + ly) / 2 + dr * 0.8)} ${r1(x - (x - lx) * 0.22)} ${r1(ly - dr * 0.2)}Q${r1(x - (x - lx) * 0.62)} ${r1(ly + dr * 0.9)} ${r1(lx)} ${r1(ly)}Q${r1(x - (x - lx) * 0.3)} ${r1(top + (ly - top) * 0.6)} ${r1(x)} ${r1(top)}Z`
    // Loose clumps resting further out on the bough, more of them as it snows.
    for (const sgn of [-1, 1]) {
      if (i === 0 || q() > 0.25 + cap) continue
      const t = 0.74 + 0.18 * q()
      const u = 1 - t
      const cx = x + sgn * (2 * u * t * tw * 0.35 + t * t * tw - tw * 0.13)
      const cy = u * u * top + 2 * u * t * sy + t * t * bot + dr * 0.1
      const a = tw * (0.05 + 0.05 * q())
      pads += `M${r1(cx - a)} ${r1(cy)}q${r1(a * 0.9)} ${r1(-a * 1.3)} ${r1(a * 2)} ${r1(a * 0.35 * sgn)}q${r1(-a)} ${r1(a * 0.75)} ${r1(-a * 2)} ${r1(-a * 0.35 * sgn)}Z`
    }
  }
  return `<path d="${boughs}" fill="${body}"/><path d="${pads}" fill="#4b5563" transform="translate(0 ${r1(h * 0.011)})"/><path d="${pads}" fill="${snow}"/>`
}

// One rolling drift of snow across the scene.
function drift(top: number, amp: number, seed: number, color: string, from = 0, to = W) {
  const r = rng(R(seed * 10))
  const step = 100
  let d = `M${from} ${H}L${from} ${R(top + amp * Math.sin(seed))}`
  for (let x = from + step; x <= to; x += step) {
    const y = top + amp * Math.sin(x / 230 + seed) + amp * 0.6 * Math.sin(x / 97 + seed * 2) + (r() - 0.5) * amp * 0.4
    d += `S${x - step / 2} ${R(y)} ${x} ${R(y)}`
  }
  return `<path d="${d}L${to} ${H}Z" fill="${color}"/>`
}

// Flakes for one falling layer. Each is drawn twice, the copy one whole fall
// behind (up by H, back by the sideways drift), so the loop has no seam.
function flakes(count: number, rMin: number, rMax: number, seed: number, opacity: number, color: string, drift = 0) {
  const r = rng(seed)
  let out = ''
  for (let i = 0; i < count; i++) {
    const x = R(-280 + r() * (W + 560))
    const y = R(r() * H)
    const rad = R((rMin + r() * (rMax - rMin)) * 10) / 10
    out += `<circle cx="${x}" cy="${y}" r="${rad}"/><circle cx="${x - drift}" cy="${y - H}" r="${rad}"/>`
  }
  return `<g fill="${color}" opacity="${opacity}">${out}</g>`
}

// A star of magnitude `mag` at (x, y): a core sized by its brightness, a soft
// halo round it, and on the brightest four thin spikes, as the eye sees them.
function star(x: number, y: number, mag: number): string {
  const core = R(Math.min(3.1, Math.max(0.9, 3.1 - 0.52 * mag)) * 10) / 10
  let out = `<circle cx="${x}" cy="${y}" r="${R(core * 30) / 10}" fill="#cfe0ff" opacity="${R(Math.min(0.2, 0.05 + core * 0.045) * 100) / 100}"/><circle cx="${x}" cy="${y}" r="${core}" fill="#f4f7ff"/>`
  if (mag < 2.3) {
    const arm = R(core * 42) / 10
    out += `<path d="M${x - arm} ${y}H${x + arm}M${x} ${y - arm}V${y + arm}" stroke="#f4f7ff" stroke-width="0.6" opacity="0.6"/>`
  }
  return out
}

// One constellation, laid flat from the middle of its own patch of sky (east
// to the left, as you see it looking up) and fitted into a box round (cx, cy).
// Each run is right ascension, declination and magnitude, star after star.
function constellation(con: Constellation, cx: number, cy: number, cls: string): string {
  const [name, runs] = con
  let ax = 0
  let ay = 0
  let az = 0
  for (const run of runs) {
    for (let i = 0; i < run.length; i += 3) {
      const ra = run[i]! * RAD
      const dec = run[i + 1]! * RAD
      ax += Math.cos(dec) * Math.cos(ra)
      ay += Math.cos(dec) * Math.sin(ra)
      az += Math.sin(dec)
    }
  }
  const ra0 = Math.atan2(ay, ax)
  const dec0 = Math.atan2(az, Math.hypot(ax, ay))
  const flat = (ra: number, dec: number): [number, number] => [
    -Math.cos(dec) * Math.sin(ra - ra0),
    -(Math.cos(dec0) * Math.sin(dec) - Math.sin(dec0) * Math.cos(dec) * Math.cos(ra - ra0)),
  ]
  let reach = 0.0001
  for (const run of runs) {
    for (let i = 0; i < run.length; i += 3) {
      const [fx, fy] = flat(run[i]! * RAD, run[i + 1]! * RAD)
      reach = Math.max(reach, Math.abs(fx) / 118, Math.abs(fy) / 96)
    }
  }
  let lines = ''
  const seen = new Set<string>()
  let dots = ''
  for (const run of runs) {
    for (let i = 0; i < run.length; i += 3) {
      const [fx, fy] = flat(run[i]! * RAD, run[i + 1]! * RAD)
      const px = R(cx + fx / reach)
      const py = R(cy + fy / reach)
      lines += `${i === 0 ? 'M' : 'L'}${px} ${py}`
      if (!seen.has(`${px} ${py}`)) {
        seen.add(`${px} ${py}`)
        dots += star(px, py, run[i + 2]!)
      }
    }
  }
  return `<g class="${cls}"><title>${name}</title><rect x="${cx - 130}" y="${cy - 110}" width="260" height="240" fill="#000000" fill-opacity="0"/><path class="ln" pathLength="1" stroke-dasharray="1" d="${lines}" fill="none" stroke="#e6e8ec" stroke-width="0.8"/>${dots}<text x="${cx}" y="${cy + 118}" text-anchor="middle" font-family="sans-serif" font-size="11" letter-spacing="1.8" fill="#e6e8ec">${name}</text></g>`
}

// Whether the aurora shows at `now`: rarely, about one three-hour slot in
// eight. While SHOW_AURORA_NOW is true it always does, to try it out.
const SHOW_AURORA_NOW = false

export function auroraAt(now: number): number {
  return SHOW_AURORA_NOW || hash(Math.floor(now / 10800000) + 77) < 0.12 ? 1 : 0
}

// The scene: night-blue pines pinned to the bottom corners, white snow on
// them and at their feet that rises with the context, a moon pinned top right
// in tonight's real phase, a few stars, light snow, shooting stars and, rarely,
// an aurora. The middle, where the words are, stays the plain near-black ground.
const GROUND = '#070707'

export function simple(percent: number, now = 0, steps = 0, busy = false, drawAurora = false, fireAge = 999, band = true, life = 99999): string {
  const s = clamp(percent / 100)
  const cap = 0.16 + 0.42 * s
  // Rolling snow across the whole foot of the window: it starts a clear band above
  // the message box (never a thin sliver beside it) and rises with the context.
  const ground = H * (0.108 + 0.1 * s)
  // On the snow: faint crests where the drifts catch the moon, and a few
  // grains that glint.
  const sr = rng(57)
  let crests = ''
  const glints = ['', '']
  for (let k = 0; k < 9; k++) {
    const cx = R(sr() * W)
    const cy = R(H - ground + 16 + sr() * Math.max(6, ground - 74))
    const cw = R(50 + sr() * 110)
    crests += `M${cx} ${cy}q${R(cw / 2)} ${-R(5 + sr() * 7)} ${cw} 0`
  }
  for (let k = 0; k < 26; k++) {
    glints[k % 2] += `<circle cx="${R(sr() * W)}" cy="${R(H - ground + 14 + sr() * (ground - 20))}" r="${R((0.7 + sr() * 0.9) * 10) / 10}"/>`
  }
  const detail = `<path d="${crests}" fill="none" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" opacity="0.15"/><g fill="#ffffff"><g class="tw" style="animation-duration:3.4s">${glints[0]}</g><g class="tw" style="animation-duration:5.2s;animation-delay:-2s">${glints[1]}</g></g>`
  const fill = (inner: string) => `<svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">${inner}</svg>`
  // `life` is how many seconds this chat has been open: the fox, the owl and
  // the constellations make their entrance on it, once, however often the
  // scene is redrawn.
  const lived = R(Math.max(0, life) * 10) / 10
  const since = (period: number, shift = 0) => `;animation-delay:-${R(((lived + shift) % period) * 100) / 100}s`
  const at = (period: number) => `;animation-delay:-${R(((now / 1000) % period) * 100) / 100}s`

  // The moon's color: it lights the pines too.
  const disc = percent >= 85 ? '#b9563f' : percent >= 60 ? '#c9965a' : '#9aa5b6'

  // Each side is a group of six pines pinned to its corner, so it shrinks
  // with the window.
  const ZW = 560
  const side = (right: boolean) => {
    const back: [number, number][] = right ? [[340, 310], [450, 430], [570, 520]] : [[440, 300], [330, 420], [215, 520]]
    const front: [number, number][] = right ? [[395, 400], [520, 620], [620, 880]] : [[385, 380], [270, 620], [160, 880]]
    let out = ''
    for (const [x, h] of back) {
      out += pine(x, 950, h, h * 0.58, 5, '#222a36', '#a4a9b1', cap, -0.2)
    }
    for (const [x, h] of front) {
      out += pine(x, 1010, h, h * 0.56, 6, '#131922', '#f2f4f6', cap, 0.2)
    }
    // Two saplings at their feet, half buried once the snow is deep.
    for (const [x, h] of right ? [[462, 150], [300, 118]] : [[92, 150], [330, 118]]) {
      out += pine(x!, 1012, h!, h! * 0.66, 2, '#131922', '#f2f4f6', Math.min(0.6, cap * 1.2), 0.2)
    }
    return out
  }

  // The wind of the moment, changing every three hours: it slants the snow.
  const slot = Math.floor(now / 10800000)
  const wind = (hash(slot + 5) - 0.5) * 2
  const blow = R(wind * 260)

  // Where the top of the front drift is at x, to stand things on the snow.
  const snowTop = (x: number) => H - ground + (9 + 12 * s) * (Math.sin(x / 230 + 2.1) + 0.6 * Math.sin(x / 97 + 4.2))

  // Footprints: one more step across the snow for each message sent.
  let prints = ''
  for (let i = 0; i < Math.min(steps, 46); i++) {
    const fx = 560 + i * 21
    const fy = snowTop(fx) + 13 + (i % 2 === 0 ? -3 : 3)
    prints += `<ellipse cx="${fx}" cy="${R(fy)}" rx="4.4" ry="2.1" transform="rotate(${i % 2 === 0 ? -12 : 10} ${fx} ${R(fy)})"/>`
  }
  prints = `<g fill="#6f757f" opacity="0.6">${prints}</g>`

  // The fox, most of the time: it sits by the fire, moves a little further
  // off, slips away leaving its tracks, and comes back, all on one slow
  // twenty-minute round kept in step with the clock.
  let fox = ''
  if (hash(slot + 31) < 0.85) {
    const sit = (gx: number, cls: string) => `<g class="${cls}"><g transform="translate(${gx} ${R(snowTop(gx) + 4)}) scale(-1.2 1.2)"><g class="tl"><path d="M-9 -3C-30 4 -47 -8 -42 -30C-39 -18 -30 -12 -15 -13Z" fill="#a4521f"/><path d="M-42 -30C-48 -20 -44 -8 -34 -4C-40 -12 -41 -21 -42 -30Z" fill="#f1ede4"/></g><path d="M-13 0C-22 -6 -20 -27 -7 -35C2 -40 11 -33 13 -22C15 -12 13 -4 13 0Z" fill="#c96a2b"/><path d="M-13 0C-20 -6 -19 -22 -12 -30C-15 -19 -13 -8 -6 0Z" fill="#a4521f"/><ellipse cx="-6" cy="-1.2" rx="7.5" ry="2.8" fill="#a4521f"/><path d="M1 -31C7 -27 10 -18 9 -7C5 -5 0 -8 -1 -15C-2 -23 -1 -28 1 -31Z" fill="#f1ede4"/><path d="M3.4 -13L3 -1.2h3.6L7.2 -13ZM9 -13L9.4 -1.2h3.6L12.4 -13Z" fill="#2a1d17"/><ellipse cx="5" cy="-0.8" rx="2.9" ry="1.5" fill="#2a1d17"/><ellipse cx="11.4" cy="-0.8" rx="2.9" ry="1.5" fill="#2a1d17"/><path d="M-5 -50L-8 -66L4 -57ZM10 -57L18 -68L19 -52Z" fill="#c96a2b"/><path d="M-4 -53L-6 -62L1 -57ZM12 -57L17 -64L17 -55Z" fill="#2a1d17"/><path d="M-7 -44C-7 -55 4 -59 13 -55C20 -52 21 -42 17 -37L8 -29L-2 -36C-6 -38 -7 -41 -7 -44Z" fill="#c96a2b"/><path d="M-6 -41C-3 -37 1 -37 5 -40C7 -37 12 -36 17 -38L8 -29L-2 -36C-4 -37 -6 -39 -6 -41Z" fill="#f1ede4"/><g class="bk" style="animation-duration:5.3s"><ellipse cx="1.5" cy="-45.5" rx="1.5" ry="2"/><ellipse cx="12" cy="-45.5" rx="1.5" ry="2"/><circle cx="2" cy="-46.2" r="0.55" fill="#ffffff"/><circle cx="12.5" cy="-46.2" r="0.55" fill="#ffffff"/></g><ellipse cx="8" cy="-31" rx="1.7" ry="1.3"/></g></g>`
    const gx = 474
    let away = ''
    for (let k = 0; k < 11; k++) {
      const wx = 548 + k * 21
      const wy = R(snowTop(wx) + 30 + (k % 2) * 4)
      away += `<ellipse cx="${wx}" cy="${wy}" rx="2.1" ry="1.3"/><circle cx="${wx + 2.6}" cy="${wy - 1.2}" r="0.7"/><circle cx="${wx + 3.2}" cy="${wy + 0.4}" r="0.7"/>`
    }
    // In a new chat it trots in from the dark, leaving its tracks, and sits down.
    const leg = (x: number, back: boolean) => `<path class="lg" style="transform-origin:${x}px -13px${back ? ';animation-direction:alternate-reverse' : ''}" d="M${x} -13V-0.5" stroke="#2a1d17" stroke-width="3.4" stroke-linecap="round"/>`
    const trot = lived < 8
      ? `<g transform="translate(${gx} ${R(snowTop(gx) + 4)})"><g class="wk" style="animation-delay:-${lived}s"><g transform="scale(1.2)"><g class="wb"><path d="M20 -19C34 -17 44 -23 51 -31C48 -21 39 -12 22 -11Z" fill="#a4521f"/><path d="M51 -31C50 -26 46 -20 40 -17C45 -21 49 -25 51 -31Z" fill="#f1ede4"/>${leg(-11, false)}${leg(15, true)}<ellipse cx="3" cy="-18" rx="21" ry="8.5" fill="#c96a2b"/><path d="M-13 -12C-4 -9 8 -9 19 -12C10 -8 -4 -8 -13 -12Z" fill="#f1ede4"/>${leg(-6, true)}${leg(20, false)}<path d="M-24 -34L-25 -47L-17 -37ZM-16 -35L-14 -47L-9 -34Z" fill="#c96a2b"/><path d="M-10 -24C-12 -34 -22 -38 -30 -33L-42 -25L-30 -21C-22 -19 -13 -19 -10 -24Z" fill="#c96a2b"/><path d="M-42 -25L-30 -21C-25 -20 -20 -20 -16 -22C-22 -25 -30 -26 -42 -25Z" fill="#f1ede4"/><circle cx="-41.5" cy="-25" r="1.5" fill="#000000"/><ellipse cx="-27" cy="-29.5" rx="1.3" ry="1.7" fill="#000000"/></g></g></g></g>`
      : ''
    let came = ''
    for (let k = 0; k < 12; k++) {
      const wx = gx + 30 + k * 25
      const wy = R(snowTop(wx) + 20 + (k % 2) * 4)
      // Each print is left as the fox passes over it, not all at once.
      const left = trot === '' ? '' : ` class="pr" style="animation-delay:${R((6.44 * (1 - (wx - gx + 26) / 340) - lived) * 10) / 10}s"`
      came += `<g${left}><ellipse cx="${wx}" cy="${wy}" rx="2.1" ry="1.3"/><circle cx="${wx - 2.6}" cy="${wy - 1.2}" r="0.7"/><circle cx="${wx - 3.2}" cy="${wy + 0.4}" r="0.7"/></g>`
    }
    fox = `<g fill="#6f757f"><g opacity="0.65">${came}</g><g class="fp">${away}</g></g><g class="si" style="animation-delay:-${lived}s">${sit(gx, 'fa')}</g>${trot}` + sit(532, 'fb')
  }
  // In a new chat the owl glides in over the pines and lands, a few seconds
  // after the fox.
  const flight = lived < 14.5
    ? `<g transform="translate(395 592)"><g class="fy" style="animation-delay:${R((9 - lived) * 10) / 10}s"><g class="wg"><path d="M2 -1Q8 -22 27 -25Q18 -9 10 2Z" fill="#6f604e"/></g><ellipse cx="2" cy="0" rx="11" ry="6.5" fill="#5c4d3e"/><circle cx="-8" cy="-2.5" r="5.8" fill="#6f604e"/><circle cx="-10.5" cy="-3.2" r="1.7" fill="#f2c94c"/><circle cx="-10.8" cy="-3.2" r="0.8"/><path d="M-13.5 -1l-2.4 1.4l2.6 0.8Z" fill="#d9a441"/><g class="wg"><path d="M0 0Q6 -24 26 -28Q16 -10 9 3Z" fill="#473b30"/></g></g></g>`
    : ''
  // The owl sits on the very tip of the small pine, a pad of snow under its claws.
  const owl = hash(slot + 33) < 0.12
    ? `${flight}<g class="ol" style="animation-delay:${R((9 - lived) * 10) / 10}s"><g transform="translate(395 592)"><ellipse cx="0" cy="18.5" rx="9" ry="3.2" fill="#eceef1"/><path d="M-9 -11L-11 -19L-4 -14ZM9 -11L11 -19L4 -14Z" fill="#5c4d3e"/><ellipse cx="0" cy="0" rx="11" ry="15" fill="#5c4d3e"/><path d="M-11 -2Q-14 6 -9 13Q-8 4 -11 -2ZM11 -2Q14 6 9 13Q8 4 11 -2Z" fill="#473b30"/><ellipse cx="0" cy="4" rx="7" ry="10" fill="#8a7862"/><path d="M-4 1l1.5 2l1.5 -2M1 1l1.5 2l1.5 -2M-2.5 6l1.5 2l1.5 -2M-4 10l1.5 2l1.5 -2M1 10l1.5 2l1.5 -2" stroke="#5c4d3e" stroke-width="0.9" fill="none"/><circle cx="-4.2" cy="-7" r="4.3" fill="#6f604e"/><circle cx="4.2" cy="-7" r="4.3" fill="#6f604e"/><g class="bk"><circle cx="-4.2" cy="-7" r="3.2" fill="#f2c94c"/><circle cx="4.2" cy="-7" r="3.2" fill="#f2c94c"/><circle cx="-4.2" cy="-7" r="1.5"/><circle cx="4.2" cy="-7" r="1.5"/></g><path d="M0 -5l-1.6 3h3.2Z" fill="#d9a441"/><path d="M-5 14l-1.5 4M-3 15v3.5M3 15v3.5M5 14l1.5 4" stroke="#d9a441" stroke-width="1.3" stroke-linecap="round"/></g></g>`
    : ''

  // A campfire at the edge of the pines, on a ring of stones: burning while
  // Claude is working, down to glowing embers and a thread of smoke when it
  // is your turn.
  const lx = 400
  const ly = R(snowTop(lx) + 9)
  const logs = `<ellipse cx="0" cy="4" rx="46" ry="9" fill="#4d525b" opacity="0.6"/><g fill="#565c66"><ellipse cx="-31" cy="1" rx="8" ry="5"/><ellipse cx="31" cy="1" rx="8" ry="5"/><ellipse cx="-17" cy="6" rx="8" ry="4.8"/><ellipse cx="17" cy="6" rx="8" ry="4.8"/><ellipse cx="0" cy="8" rx="7.5" ry="4.5"/></g><g fill="#737a85"><ellipse cx="-32" cy="-0.6" rx="5" ry="2"/><ellipse cx="30" cy="-0.6" rx="5" ry="2"/><ellipse cx="-18" cy="4.4" rx="5" ry="1.9"/><ellipse cx="16" cy="4.4" rx="5" ry="1.9"/></g><g stroke-linecap="round"><path d="M-26 -1L20 -12" stroke="#2a1c13" stroke-width="9.5"/><path d="M-26 -3L20 -14" stroke="#4a3322" stroke-width="2.2"/><path d="M-20 -12L26 -1" stroke="#33231a" stroke-width="9.5"/><path d="M-20 -14L26 -3" stroke="#553b28" stroke-width="2.2"/><path d="M-5 -3L8 -22" stroke="#2e2017" stroke-width="7.5"/></g><g><ellipse cx="20.5" cy="-12" rx="2.6" ry="4.6" fill="#8a6644"/><ellipse cx="20.5" cy="-12" rx="1.2" ry="2.3" fill="#5c4028"/><ellipse cx="-20.5" cy="-12" rx="2.6" ry="4.6" fill="#8a6644"/><ellipse cx="-20.5" cy="-12" rx="1.2" ry="2.3" fill="#5c4028"/></g>`
  // The fire keeps its state across redraws: `fireAge` is how many seconds
  // ago it was lit (while Claude works) or left to die (once it has
  // answered). It grows in a second or two, and dies down over half a minute
  // to the embers, picking up at the right moment whenever the scene is redrawn.
  const age = R(Math.max(0, fireAge) * 10) / 10
  const alive = busy || age < 34
  const phase = busy ? `animation:grow 1.8s ease-out both;animation-delay:-${age}s` : `animation:die 34s ease-in both;animation-delay:-${age}s`
  const embers = `<ellipse class="lf" cx="0" cy="-8" rx="11" ry="4" fill="#b83d25"/><ellipse cx="-3" cy="-8.4" rx="4.5" ry="1.8" fill="#ff9a4d"/><ellipse cx="5" cy="-7.4" rx="2.6" ry="1.2" fill="#ffc06a"/>`
  const smoke = `<g fill="#8a9099"><circle class="sm" cx="2" cy="-26" r="5" opacity="0.25"/><circle class="sm" style="animation-delay:-5s" cx="-1" cy="-40" r="7" opacity="0.18"/></g>`
  const fire = `${alive ? `<g style="${phase}"><circle cx="0" cy="-26" r="104" fill="url(#wg)" class="lf"/><ellipse cx="0" cy="7" rx="92" ry="15" fill="#ffb45a" opacity="0.14"/></g>` : ''}${logs}${embers}${alive ? `<g style="${phase}"><path class="fl" d="M-16 -6C-24 -22 -12 -30 -14 -46C-6 -40 -4 -32 -2 -28C-2 -44 6 -56 4 -70C14 -58 16 -46 14 -36C18 -40 20 -46 20 -50C26 -36 24 -18 16 -6Z" fill="#e8601c"/><path class="fl" style="animation-duration:0.66s" d="M-10 -6C-16 -18 -8 -24 -8 -34C-3 -30 -2 -24 0 -22C0 -34 6 -42 6 -52C12 -42 13 -32 11 -26C15 -22 16 -14 11 -6Z" fill="#ff9a2e"/><path class="fl" style="animation-duration:0.52s" d="M-6 -6C-9 -14 -4 -18 -3 -26C1 -22 2 -18 3 -16C4 -22 7 -26 7 -32C10 -24 10 -14 7 -6Z" fill="#ffd35a"/><path class="fl" style="animation-duration:0.41s" d="M-3 -6C-4 -11 0 -14 1 -19C4 -14 5 -10 3 -6Z" fill="#fff4c9"/><g fill="#ffc45e"><circle class="em" cx="-8" cy="-52" r="1.4"/><circle class="em" style="animation-delay:-0.9s" cx="10" cy="-60" r="1.2"/><circle class="em" style="animation-delay:-1.7s" cx="2" cy="-72" r="1"/><circle class="em" style="animation-delay:-2.4s" cx="-3" cy="-64" r="0.9"/><circle class="em" style="animation-delay:-2.9s" cx="14" cy="-48" r="1.1"/></g></g>` : ''}${busy ? '' : smoke}`
  const lantern = `<g transform="translate(${lx} ${ly})">${fire}</g>`

  // A faint thin halo round the moon on some nights when it is full or nearly, and now and then a pad of snow
  // that slides off a bough.
  const ringNight = hash(slot + 13) < 0.5
  const slide = `<g class="sl" fill="#eceef1"><ellipse cx="300" cy="640" rx="13" ry="5"/><circle cx="292" cy="646" r="3"/><circle cx="309" cy="647" r="2.4"/></g>`

  // The Plough over the left-hand pines and Orion over the right, each star
  // in its place, joined by a thread of light.
  // Constellations, two at a time, most three-hour slots but not all: one
  // over each group of pines, with its name beside it (brighter under the
  // pointer). They take turns, so the whole list comes round.
  let sky = ''
  if (hash(slot + 41) < 0.7) {
    const first = Math.floor(hash(slot + 43) * ATLAS.length)
    const second = (first + 1 + Math.floor(hash(slot + 47) * (ATLAS.length - 1))) % ATLAS.length
    sky = constellation(ATLAS[first]!, 345, 215, 'cn') + constellation(ATLAS[second]!, 1405, 400, 'cn c2')
  }

  // Without the shader the aurora is drawn here instead, more simply: the
  // same thin green arc, a soft haze round it, and rays that brighten and
  // dim in three groups.
  let aurora = ''
  if (drawAurora && auroraAt(now) === 1) {
    const ar = rng(slot + 9)
    const hemAt = (x: number) => 320 - 62 + 0.000097 * (x - 800) * (x - 800) + 12 * Math.sin(x / 190 + slot)
    let arcPath = ''
    for (let x = -20; x <= W + 20; x += 60) {
      arcPath += `${x === -20 ? 'M' : 'L'}${x} ${R(hemAt(x))}`
    }
    const rays = ['', '', '']
    for (let x = 10; x < W; x += 14 + ar() * 26) {
      const tall = 26 + ar() * ar() * 120
      const wide = 5 + ar() * 9
      const y = hemAt(x)
      rays[Math.floor(ar() * 3)] += `<path d="M${R(x - wide)} ${R(y)}L${R(x)} ${R(y - tall)}L${R(x + wide)} ${R(y)}Z" opacity="${R((0.25 + ar() * 0.6) * 100) / 100}"/>`
    }
    aurora = `<path d="${arcPath}" fill="none" stroke="#3fd98c" stroke-width="26" opacity="0.1"/><g fill="url(#ar)"><g class="ra">${rays[0]}</g><g class="ra" style="animation-duration:7s;animation-delay:-3s">${rays[1]}</g><g class="ra" style="animation-duration:9s;animation-delay:-5s">${rays[2]}</g></g><path d="${arcPath}" fill="none" stroke="#9dffc4" stroke-width="2.4" opacity="0.75"/>`
  }

  // A shooting star, rare: a bright head with a soft glow and a long tail
  // that thins to nothing behind it.
  const meteor = `<path d="M-1 -2.2L212 -82L1 2.2Z" fill="url(#sg)"/><circle r="7" fill="#cfe0ff" opacity="0.22"/><circle r="2.4" fill="#ffffff"/>`

  // The other stars: many faint, a few bright, as in a real sky.
  const q = rng(3)
  const groups = ['', '']
  for (let i = 0; i < 46; i++) {
    const sx = R(q() * W)
    const sy = R(q() * 560)
    const mag = 1.2 + 4.4 * Math.sqrt(q())
    groups[i % 2] += star(sx, sy, mag)
  }
  const stars = `<g class="tw">${groups[0]}</g><g class="tw" style="animation-delay:-3.1s;animation-duration:9s">${groups[1]}</g>`

  // The moon: dim and pale with its grey seas. As the context fills it sinks a
  // little, turns amber, then red, with a wider warm glow, like a moon setting. Its lit part is tonight's real phase, as seen from the northern half of the world:
  // lit on the right while it waxes, on the left while it wanes.
  const glow = percent >= 85 ? 0.34 : percent >= 60 ? 0.24 : 0.12
  const f = moonAge(now)
  const lit = f < 0.5 ? f * 2 : (1 - f) * 2
  const off = Math.max(0.22, lit) * 72 * (f < 0.5 ? -1 : 1)
  const MR = 36
  // The seas where they really are on the near side (north up): Imbrium and
  // Serenitatis above, Procellarum down the left, Tranquillitatis and Crisium
  // on the right, Nubium and Humorum below. Then a few dark craters.
  const maria: [number, number, number, number][] = [[893, 88, 13, 10], [913, 88, 8, 8], [921, 101, 9, 8], [932, 92, 4, 5], [880, 104, 8, 15], [896, 124, 10, 7], [884, 121, 5, 5], [928, 114, 5, 7], [919, 118, 4, 4], [903, 76, 15, 3], [906, 100, 6, 5]]
  // Each sea is an irregular shape with a darker heart, not an ellipse.
  const mr = rng(1969)
  const blob = (cx: number, cy: number, rx: number, ry: number) => {
    const pts: [number, number][] = []
    for (let k = 0; k < 9; k++) {
      const an = (k / 9) * Math.PI * 2
      const j = 0.72 + mr() * 0.5
      pts.push([cx + Math.cos(an) * rx * j, cy + Math.sin(an) * ry * j])
    }
    const mid = (i: number): [number, number] => {
      const p0 = pts[i % 9]!
      const p1 = pts[(i + 1) % 9]!
      return [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2]
    }
    const r1 = (v: number) => R(v * 10) / 10
    const start = mid(8)
    let d = `M${r1(start[0])} ${r1(start[1])}`
    for (let i = 0; i < 9; i++) {
      const c = pts[i]!
      const m = mid(i)
      d += `Q${r1(c[0])} ${r1(c[1])} ${r1(m[0])} ${r1(m[1])}`
    }
    return d + 'Z'
  }
  let outer = ''
  let heart = ''
  for (const [cx, cy, rx, ry] of maria) {
    outer += blob(cx, cy, rx, ry)
    heart += blob(cx + 0.6, cy + 0.4, rx * 0.62, ry * 0.62)
  }
  // Scattered craters, each a dark bowl with a faint lit lip, and Tycho's rays.
  let bowls = ''
  let lips = ''
  for (let k = 0; k < 52; k++) {
    const an = mr() * Math.PI * 2
    const dist = Math.sqrt(mr()) * (MR - 3)
    const cr = R((0.5 + mr() * mr() * 2.4) * 10) / 10
    const cx = R((905 + Math.cos(an) * dist) * 10) / 10
    const cy = R((105 + Math.sin(an) * dist) * 10) / 10
    bowls += `<circle cx="${cx}" cy="${cy}" r="${cr}"/>`
    lips += `<path d="M${R((cx - cr) * 10) / 10} ${cy}a${cr} ${cr} 0 0 0 ${R(cr * 20) / 10} 0" />`
  }
  let rays = ''
  for (let k = 0; k < 9; k++) {
    const an = -Math.PI * (0.08 + (k / 8) * 0.84)
    const len = 14 + mr() * 22
    rays += `M902 134L${R((902 + Math.cos(an) * len) * 10) / 10} ${R((134 + Math.sin(an) * len) * 10) / 10}`
  }
  const seas = `<path d="${outer}" fill="${GROUND}" opacity="0.24"/><path d="${heart}" fill="${GROUND}" opacity="0.16"/><ellipse cx="906" cy="128" rx="20" ry="10" fill="#ffffff" opacity="0.06"/><path d="${rays}" stroke="#ffffff" stroke-width="0.7" opacity="0.1" fill="none"/><g fill="${GROUND}" opacity="0.15">${bowls}</g><g fill="none" stroke="#ffffff" stroke-width="0.35" opacity="0.16">${lips}</g><circle cx="902" cy="134" r="1.6" fill="#ffffff" opacity="0.18"/>`
  const moon = `<circle cx="905" cy="105" r="${percent >= 60 ? 170 : 110}" fill="url(#mg)"/><clipPath id="mc"><circle cx="905" cy="105" r="${MR}"/></clipPath><circle cx="905" cy="105" r="${MR}" fill="${disc}"/><g clip-path="url(#mc)">${seas}<circle cx="905" cy="105" r="${MR}" fill="url(#ml)"/><circle cx="${R(905 + off)}" cy="105" r="${MR}" fill="${GROUND}" opacity="${lit > 0.95 ? 0 : 0.93}"/></g>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
<style>
.f1{animation:fall 80s linear infinite${at(80)}}
.f2{animation:fall 52s linear infinite${at(52)}}
.s1{animation:sway 11s ease-in-out infinite alternate${at(22)}}
.s2{animation:sway 8s ease-in-out infinite alternate${at(16)}}
.f3{animation:fall 33s linear infinite${at(33)}}
.s3{animation:sway 6s ease-in-out infinite alternate${at(12)}}
.cn text{opacity:0;animation:cn 96s ease-in-out infinite${since(96, 77)}}
.cn .ln{opacity:0;animation:cl 96s ease-in-out infinite${since(96, 77)}}
.c2 text,.c2 .ln{animation-delay:-${R(((lived + 29) % 96) * 100) / 100}s}
.cn:hover text{animation:none;opacity:1}
.cn:hover .ln{animation:none;opacity:0.6}
@keyframes cn{0%,86%,100%{opacity:0}90%,96%{opacity:0.3}}
@keyframes cl{0%,80%{opacity:0;stroke-dashoffset:1}81%{opacity:0.5;stroke-dashoffset:1}89%,96%{opacity:0.5;stroke-dashoffset:0}100%{opacity:0;stroke-dashoffset:0}}
.fa{animation:fa 1200s linear infinite${since(1200)}}
.fb{opacity:0;animation:fb 1200s linear infinite${since(1200)}}
.fp{opacity:0;animation:fp 1200s linear infinite${since(1200)}}
.wk{animation:wk 7s linear both}
.pr{animation:pr 0.5s ease-out both}
@keyframes pr{from{opacity:0}to{opacity:1}}
.si{animation:si 7s linear both}
@keyframes si{0%,90%{opacity:0}98%,100%{opacity:1}}
.wb{animation:wb 0.34s ease-in-out infinite alternate}
@keyframes wb{from{transform:translateY(0px)}to{transform:translateY(-1.8px)}}
.lg{animation:lg 0.34s ease-in-out infinite alternate}
@keyframes lg{from{transform:rotate(-26deg)}to{transform:rotate(26deg)}}
.fy{animation:fy 5.5s cubic-bezier(0.2,0.6,0.3,1) both}
@keyframes fy{0%{transform:translate(330px,-250px);opacity:0}6%{opacity:1}70%{transform:translate(40px,-52px)}96%{opacity:1}100%{transform:translate(0px,-8px);opacity:0}}
.ol{animation:si 5.5s linear both}
.wg{animation:wg 0.3s ease-in-out infinite alternate;transform-origin:4px 0px}
@keyframes wg{from{transform:scaleY(1)}to{transform:scaleY(-0.55)}}
@keyframes fa{0%,45%{opacity:1}45.25%,74.75%{opacity:0}75%,100%{opacity:1}}
@keyframes fb{0%,45.3%{opacity:0}45.55%,60%{opacity:1}60.25%,100%{opacity:0}}
@keyframes fp{0%,60%{opacity:0}60.4%,76%{opacity:0.65}82%,100%{opacity:0}}
.tl{animation:tl 4.2s ease-in-out infinite alternate;transform-origin:-9px -3px}
@keyframes tl{from{transform:rotate(-4deg)}to{transform:rotate(5deg)}}
.tw{animation:tw 7s ease-in-out infinite alternate}
.ss{opacity:0;animation:shoot 307s linear infinite${at(307)}}
.st{opacity:0;animation:shoot2 563s linear infinite${at(563)}}
@keyframes fall{from{transform:translate(0px,0px)}to{transform:translate(${blow}px,${H}px)}}
@keyframes sway{from{transform:translateX(-18px)}to{transform:translateX(18px)}}
@keyframes tw{from{opacity:1}to{opacity:0.35}}
.ra{animation:ra 5s ease-in-out infinite alternate}
@keyframes ra{from{opacity:0.25}to{opacity:1}}
@keyframes grow{from{transform:scale(0.25);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes die{0%{transform:scale(1);opacity:1}70%{transform:scale(0.45);opacity:0.85}100%{transform:scale(0.12);opacity:0}}
.fl{animation:fl 0.8s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:50% 100%}
@keyframes fl{from{transform:scale(1,0.94) skewX(-3deg)}to{transform:scale(0.94,1.1) skewX(3deg)}}
.em{animation:em 3.4s linear infinite}
@keyframes em{from{transform:translate(0px,0px);opacity:0.9}to{transform:translate(9px,-58px);opacity:0}}
.sm{animation:sm 10s linear infinite;transform-box:fill-box;transform-origin:center}
@keyframes sm{0%{transform:translate(0px,8px) scale(0.6);opacity:0}25%{opacity:0.3}100%{transform:translate(14px,-52px) scale(1.7);opacity:0}}
.lf{animation:lf 2.6s ease-in-out infinite alternate}
@keyframes lf{from{opacity:0.86}to{opacity:1}}
.bk{animation:bk 6.5s linear infinite;transform-box:fill-box;transform-origin:center}
@keyframes bk{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(0.08)}}
.sl{animation:sl 41s ease-in infinite${at(41)};opacity:0}
@keyframes sl{0%{transform:translate(0px,0px);opacity:0}1%{opacity:1}6%{transform:translate(${R(blow / 9)}px,330px);opacity:0.9}7%,100%{transform:translate(${R(blow / 9)}px,345px);opacity:0}}
@keyframes wk{0%{transform:translate(340px,${R(snowTop(814) - snowTop(474))}px);opacity:0}7%{opacity:1}50%{transform:translate(170px,${R(snowTop(644) - snowTop(474))}px)}92%{transform:translate(0px,0px);opacity:1}100%{transform:translate(0px,0px);opacity:0}}
@keyframes shoot{0%{transform:translate(1180px,60px) scale(0.2);opacity:0}0.05%{opacity:1}0.3%{transform:translate(760px,222px) scale(1);opacity:1}0.42%{transform:translate(610px,280px) scale(0.5);opacity:0}100%{transform:translate(610px,280px) scale(0.5);opacity:0}}
@keyframes shoot2{0%{transform:translate(560px,40px) scale(0.2);opacity:0}0.03%{opacity:0.9}0.15%{transform:translate(300px,150px) scale(0.8);opacity:0.9}0.21%{transform:translate(200px,192px) scale(0.4);opacity:0}100%{transform:translate(200px,192px) scale(0.4);opacity:0}}
</style>
<defs>
<linearGradient id="ar" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#3fd98c" stop-opacity="0"/>
<stop offset="1" stop-color="#8dffc0" stop-opacity="0.7"/>
</linearGradient>
<linearGradient id="g1" gradientUnits="userSpaceOnUse" x1="0" y1="938" x2="0" y2="970">
<stop offset="0" stop-color="#6b7078"/>
<stop offset="1" stop-color="#555a63"/>
</linearGradient>
<linearGradient id="g2" gradientUnits="userSpaceOnUse" x1="0" y1="938" x2="0" y2="970">
<stop offset="0" stop-color="#b9bdc4"/>
<stop offset="1" stop-color="#555a63"/>
</linearGradient>
<linearGradient id="g3" gradientUnits="userSpaceOnUse" x1="0" y1="938" x2="0" y2="970">
<stop offset="0" stop-color="#a9adb5"/>
<stop offset="1" stop-color="#555a63"/>
</linearGradient>
<linearGradient id="sg" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="212" y2="-82">
<stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
<stop offset="0.25" stop-color="#cfe0ff" stop-opacity="0.45"/>
<stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/>
</linearGradient>
<linearGradient id="sb" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="${GROUND}" stop-opacity="0.82"/>
<stop offset="0.95" stop-color="${GROUND}" stop-opacity="0.82"/>
<stop offset="1" stop-color="${GROUND}" stop-opacity="0"/>
</linearGradient>
<radialGradient id="wg">
<stop offset="0" stop-color="#ffb45a" stop-opacity="0.3"/>
<stop offset="1" stop-color="#ffc76a" stop-opacity="0"/>
</radialGradient>
<radialGradient id="ml">
<stop offset="0.6" stop-color="${GROUND}" stop-opacity="0"/>
<stop offset="1" stop-color="${GROUND}" stop-opacity="0.28"/>
</radialGradient>
<radialGradient id="mg">
<stop offset="0" stop-color="${disc}" stop-opacity="${glow}"/>
<stop offset="1" stop-color="${disc}" stop-opacity="0"/>
</radialGradient>
</defs>
<rect width="100%" height="100%" fill="${GROUND}"/>
<svg width="100%" height="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin slice">
${stars}
${sky}
${aurora}
<g class="ss">${meteor}</g>
<g class="st">${meteor}</g>
<g class="s1"><g class="f1">${flakes(R(96 + 50 * s), 1, 1.9, 11, 0.6, '#eceef1', blow)}</g></g>
<g class="s2"><g class="f2">${flakes(R(44 + 26 * s), 2.1, 3, 23, 0.7, '#eceef1', blow)}</g></g>
<g class="s3"><g class="f3">${flakes(R(16 + 10 * s), 3.4, 4.6, 37, 0.42, '#eceef1', blow)}</g></g>
</svg>
<svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMaxYMin meet"><g transform="translate(0 ${R(Math.max(0, s - 0.5) * 160)})">${ringNight && lit > 0.9 ? `<circle cx="905" cy="105" r="148" fill="none" stroke="${disc}" stroke-width="3" opacity="0.035"/><circle cx="905" cy="105" r="146" fill="none" stroke="${disc}" stroke-width="0.7" opacity="0.1"/>` : ''}${moon}</g></svg>
${fill(drift(H - ground - 22, 12 + 8 * s, 1.3, 'url(#g1)'))}
<svg overflow="visible" x="0" width="30%" height="100%" viewBox="0 0 ${ZW} ${H}" preserveAspectRatio="xMinYMax meet">${side(false)}${slide}</svg>
<svg overflow="visible" x="70%" width="30%" height="100%" viewBox="0 0 ${ZW} ${H}" preserveAspectRatio="xMaxYMax meet">${side(true)}${owl}</svg>
${fill(drift(H - ground, 9 + 12 * s, 2.1, 'url(#g2)') + drift(H - ground + 34, 7 + 6 * s, 4.4, 'url(#g3)') + detail + prints + lantern + fox)}
${band ? `<rect x="0" y="0" width="202" height="100%" fill="url(#sb)"/>` : ''}
</svg>`
}
