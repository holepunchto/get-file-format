const b4a = require('b4a')

function toBuffer(buffer) {
  if (ArrayBuffer.isView(buffer)) return b4a.toBuffer(buffer)
  if (buffer instanceof ArrayBuffer) return b4a.from(buffer)

  throw new TypeError('Expected a Buffer, typed array, or ArrayBuffer')
}

function startsWith(buffer, sequence, offset = 0) {
  for (let i = 0; i < sequence.length; i++) {
    if (buffer[i + offset] !== sequence[i]) {
      return false
    }
  }
  return true
}

function lookup(types, buffer) {
  for (const type in types) {
    for (const { sequence, offset = 0 } of types[type]) {
      if (startsWith(buffer, sequence, offset)) {
        return type
      }
    }
  }
  return null
}

async function readAt(reader, offset, length) {
  const buffer = await reader.read(offset, length)
  return toBuffer(buffer)
}

module.exports = {
  toBuffer,
  startsWith,
  lookup,
  readAt
}
