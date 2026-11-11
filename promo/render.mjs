// Render promo frames by driving a headless Chromium (Edge) over the DevTools
// Protocol. Every frame is produced from the paused CSS timeline at an exact
// timestamp, so the output is frame-accurate instead of a screen recording.
//
// Usage:
//   node render.mjs --stills 2.5,10,20 --out ../promo/stills
//   node render.mjs --fps 30 --duration 55 --out ../promo/frames
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const args = parseArgs(process.argv.slice(2))
const PORT = Number(args.port ?? 9222)
const OUT = path.resolve(HERE, args.out ?? 'frames')
const FPS = Number(args.fps ?? 30)
const DURATION = Number(args.duration ?? 55)
const STILLS = args.stills ? String(args.stills).split(',').map(Number) : null
const PAGE = pathToFileURL(path.join(HERE, 'index.html')).href

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true'
    out[key.slice(2)] = value
  }
  return out
}

async function endpoint() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const targets = await res.json()
      const page = targets.find((t) => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch {
      // browser is still starting
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('could not reach the browser debugging endpoint')
}

const socket = new WebSocket(await endpoint())
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

let nextId = 0
const pending = new Map()
const events = new Map()

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (message.id !== undefined) {
    const entry = pending.get(message.id)
    if (!entry) return
    pending.delete(message.id)
    if (message.error) entry.reject(new Error(`${message.error.message} (${message.error.code})`))
    else entry.resolve(message.result)
    return
  }
  const handler = events.get(message.method)
  if (handler) handler(message.params)
})

function send(method, params = {}) {
  const id = ++nextId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}

function once(method) {
  return new Promise((resolve) => events.set(method, resolve))
}

async function evaluate(expression, awaitPromise = false) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
  })
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? 'evaluate failed')
  }
  return result.result?.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
  mobile: false,
})

const loaded = once('Page.loadEventFired')
await send('Page.navigate', { url: PAGE })
await loaded
await evaluate('window.__readyPromise', true)
await evaluate('document.fonts.ready.then(() => true)', true)

await mkdir(OUT, { recursive: true })

async function capture(file) {
  const shot = await send('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 95,
    fromSurface: true,
    captureBeyondViewport: false,
  })
  await writeFile(file, Buffer.from(shot.data, 'base64'))
}

if (STILLS) {
  for (const time of STILLS) {
    await evaluate(`window.__seek(${time}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`, true)
    await capture(path.join(OUT, `still-${String(time).replace('.', '_')}.jpg`))
    console.log(`still ${time}s`)
  }
} else {
  const total = Math.round(FPS * DURATION)
  const started = Date.now()
  for (let index = 0; index < total; index += 1) {
    const time = index / FPS
    await evaluate(`window.__seek(${time}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`, true)
    await capture(path.join(OUT, `${String(index).padStart(5, '0')}.jpg`))
    if (index % 60 === 0) {
      const elapsed = ((Date.now() - started) / 1000).toFixed(1)
      console.log(`frame ${index}/${total} @ ${time.toFixed(2)}s (${elapsed}s)`)
    }
  }
  console.log(`done: ${total} frames in ${((Date.now() - started) / 1000).toFixed(1)}s`)
}

socket.close()
process.exit(0)
