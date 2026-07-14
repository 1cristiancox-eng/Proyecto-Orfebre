// Genera iconos PNG para la PWA sin dependencias externas.
// Dibuja un fondo dorado con un rombo (gema) central.
import zlib from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '..', 'public')
mkdirSync(publicDir, { recursive: true })

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t)
}

function drawIcon(size) {
  const data = Buffer.alloc(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  // Colores del degradado (dorado)
  const top = [201, 162, 39] // #c9a227
  const bottom = [113, 71, 34] // #714722
  const gem = [250, 247, 240] // crema
  const gemEdge = [230, 215, 172]

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = y / size
      let r = lerp(top[0], bottom[0], t)
      let g = lerp(top[1], bottom[1], t)
      let b = lerp(top[2], bottom[2], t)

      // Rombo central (distancia Manhattan normalizada)
      const dx = Math.abs(x - cx)
      const dy = Math.abs(y - cy)
      const diamond = (dx + dy) / (size * 0.34)
      if (diamond < 1) {
        // Facetas simples: matiz según cuadrante
        const shade = 0.85 + 0.15 * (1 - diamond)
        r = Math.round(gem[0] * shade)
        g = Math.round(gem[1] * shade)
        b = Math.round(gem[2] * shade)
      } else if (diamond < 1.08) {
        r = gemEdge[0]
        g = gemEdge[1]
        b = gemEdge[2]
      }

      const i = (y * size + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }
  }
  return data
}

// --- Codificador PNG mínimo ---
function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  // Filtro 0 por scanline
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  const png = encodePNG(size, drawIcon(size))
  writeFileSync(resolve(publicDir, `pwa-${size}x${size}.png`), png)
  console.log(`✔ pwa-${size}x${size}.png`)
}
// apple-touch-icon 180
writeFileSync(resolve(publicDir, 'apple-touch-icon.png'), encodePNG(180, drawIcon(180)))
console.log('✔ apple-touch-icon.png')

// favicon.svg
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#c9a227"/><stop offset="1" stop-color="#714722"/>
  </linearGradient></defs>
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <path d="M32 14 L46 32 L32 50 L18 32 Z" fill="#faf7f0" stroke="#e6d7ac" stroke-width="1.5"/>
</svg>`
writeFileSync(resolve(publicDir, 'favicon.svg'), favicon)
console.log('✔ favicon.svg')
