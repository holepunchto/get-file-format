const b4a = require('b4a')

const TAG_SVG_OPEN = b4a.from('<svg')
const CHAR_GT = 0x3e // >
const CHAR_SLASH = 0x2f // /  (for <tag/>)
const TAG_BOUNDARIES = [
  0x20, // space
  CHAR_GT, // >
  0x0a, // \n
  0x09, // \t
  0x0d, // \r
  CHAR_SLASH
]

function isLikelySvg(buffer) {
  const openIndex = b4a.indexOf(buffer, TAG_SVG_OPEN)
  if (openIndex === -1) return false

  const nextByte = buffer[openIndex + 4]
  if (nextByte && !TAG_BOUNDARIES.includes(nextByte)) return false

  const tagEnd = b4a.indexOf(buffer, CHAR_GT, openIndex)
  if (tagEnd === -1) return false

  return true
}

function detect(format, buffer) {
  if (format === 'svg') return 'svg'
  if (isLikelySvg(buffer)) return 'svg'

  return 'xml'
}

module.exports = {
  detect
}
