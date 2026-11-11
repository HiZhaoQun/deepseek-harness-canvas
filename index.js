/**
 * Host half of DeepSeek Harness Canvas.
 *
 * The visual canvas is rendered by the Client module. The Host owns one small
 * responsibility: serving the package-local ES modules that the browser loads
 * on demand. Serving them from the Harness origin keeps the plugin
 * self-contained (no CDN, no duplicate React) and lets the Client use native
 * dynamic imports.
 */
import { createReadStream } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ASSETS_ROOT = path.join(HERE, 'assets')
const ASSET_PREFIX = '/deepseek-canvas/assets/'
// The route table matches `path` and `path/...`, so the registered path omits
// the trailing slash while the handler keeps it for safe relative resolution.
const ASSET_ROUTE = ASSET_PREFIX.slice(0, -1)

const MIME_TYPES = new Map([
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
])

function contentType(file) {
  return MIME_TYPES.get(path.extname(file).toLowerCase()) ?? 'application/octet-stream'
}

/**
 * Resolve one request path below the package asset root.
 * @param {string} pathname - request pathname.
 * @returns {string | undefined} absolute file path inside the asset root.
 */
function resolveAsset(pathname) {
  if (!pathname.startsWith(ASSET_PREFIX)) return undefined
  let relative
  try {
    relative = decodeURIComponent(pathname.slice(ASSET_PREFIX.length))
  } catch {
    return undefined
  }
  if (relative.length === 0 || relative.includes('\0')) return undefined
  const resolved = path.resolve(ASSETS_ROOT, relative)
  const rootWithSeparator = ASSETS_ROOT.endsWith(path.sep) ? ASSETS_ROOT : ASSETS_ROOT + path.sep
  return resolved.startsWith(rootWithSeparator) ? resolved : undefined
}

/**
 * Serve one asset with a conservative content type and immutable caching.
 * @param {import('node:http').IncomingMessage} req - request.
 * @param {import('node:http').ServerResponse} res - response.
 */
async function serveAsset(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405
    res.setHeader('Allow', 'GET, HEAD')
    res.end('Method Not Allowed')
    return
  }

  const url = new URL(req.url ?? '/', 'http://deepseek-canvas.local')
  const file = resolveAsset(url.pathname)
  if (file === undefined) {
    res.statusCode = 404
    res.end('Not Found')
    return
  }

  let stat
  try {
    stat = await fs.stat(file)
  } catch {
    res.statusCode = 404
    res.end('Not Found')
    return
  }
  if (!stat.isFile()) {
    res.statusCode = 404
    res.end('Not Found')
    return
  }

  res.statusCode = 200
  res.setHeader('Content-Type', contentType(file))
  res.setHeader('Content-Length', String(stat.size))
  res.setHeader('Cache-Control', path.extname(file).toLowerCase() === '.js'
    ? 'no-cache'
    : 'public, max-age=3600')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (req.method === 'HEAD') {
    res.end()
    return
  }

  const stream = createReadStream(file)
  stream.on('error', () => {
    if (!res.headersSent) res.statusCode = 500
    res.end()
  })
  stream.pipe(res)
}

/**
 * Register the static asset route when the Web carrier is composed.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host plugin context.
 */
export function apply(ctx) {
  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(
      () => webCtx.webServer.register({
        kind: 'prefix',
        path: ASSET_ROUTE,
        handler: serveAsset,
      }),
      'deepseek-canvas: static assets',
    )
  })
}
