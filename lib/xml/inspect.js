const b4a = require('b4a')
const { readAt } = require('../util')

const CHUNK_SIZE = 64 * 1024
const MAX_INSPECTION_BYTES = 5 * 1024 * 1024
const TAG_SVG_OPEN = b4a.from('<svg')
const CHAR_GT = 0x3e // >
const CHAR_SLASH = 0x2f // /  (for <tag/>)
const TAG_BOUNDARIES = [
  0x20, // space
  CHAR_GT,
  0x0a, // \n
  0x09, // \t
  0x0d, // \r
  CHAR_SLASH
]

function scan(buffer, state) {
  for (const byte of buffer) {
    if (state.insideTag) {
      if (byte === CHAR_GT) return true
      continue
    }

    if (state.matched === TAG_SVG_OPEN.length) {
      if (TAG_BOUNDARIES.includes(byte)) {
        if (byte === CHAR_GT) return true
        state.insideTag = true
      } else {
        state.matched = byte === TAG_SVG_OPEN[0] ? 1 : 0
      }

      continue
    }

    if (byte === TAG_SVG_OPEN[state.matched]) {
      state.matched++
    } else {
      state.matched = byte === TAG_SVG_OPEN[0] ? 1 : 0
    }
  }

  return false
}

function isLikelySvg(buffer) {
  return scan(buffer, { matched: 0, insideTag: false })
}

async function inspectSvgAt(buffer, reader, size) {
  const state = { matched: 0, insideTag: false }
  if (scan(buffer, state)) return true

  const end = Math.min(size, MAX_INSPECTION_BYTES)

  for (let offset = buffer.length; offset < end;) {
    const chunk = await readAt(reader, offset, Math.min(CHUNK_SIZE, end - offset))
    if (chunk.length === 0) return false
    if (scan(chunk, state)) return true
    offset += chunk.length
  }

  return false
}

module.exports = {
  inspectSvgAt,
  isLikelySvg
}
