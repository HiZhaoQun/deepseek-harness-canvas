// Capture real UI states from the running plugin code.
//
// The harness page at promo/capture/index.html mounts the actual client view
// (assets/app.js) against a stubbed host, so these screenshots are rendered by
// the shipped code rather than redrawn by hand.
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.argv[2] ?? 9340)
const OUT = path.join(HERE, 'out')
const URL_PAGE = process.argv[3] ?? 'http://127.0.0.1:8765/promo/capture/index.html'
const STATES = ['tiles', 'branch', 'expanded', 'drag', 'reader']

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const target = list.find((t) => t.type === 'page')
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true })
  ws.addEventListener('error', reject, { once: true })
})

let id = 0
const pending = new Map()
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (message.id !== undefined) pending.get(message.id)?.(message)
})
const send = (method, params = {}) => new Promise((resolve) => {
  const next = ++id
  pending.set(next, resolve)
  ws.send(JSON.stringify({ id: next, method, params }))
})
const evaluate = async (expression, awaitPromise = true) => {
  const message = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true })
  if (message.result?.exceptionDetails) {
    throw new Error(message.result.exceptionDetails.exception?.description ?? 'evaluate failed')
  }
  return message.result?.result?.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
  mobile: false,
})
await send('Page.navigate', { url: URL_PAGE })

for (let attempt = 0; attempt < 40; attempt += 1) {
  const ready = await evaluate('window.__demoReady === true && window.__demo.store()?.size?.width === 1920')
  if (ready) break
  await new Promise((r) => setTimeout(r, 250))
}

await mkdir(OUT, { recursive: true })
for (const state of STATES) {
  await evaluate(`window.__demo.apply('${state}'); new Promise(r => setTimeout(r, 320))`)
  const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false })
  await writeFile(path.join(OUT, `${state}.png`), Buffer.from(shot.result.data, 'base64'))
  console.log(`captured ${state}`)
}

ws.close()
process.exit(0)
