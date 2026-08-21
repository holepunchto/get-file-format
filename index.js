const b4a = require('b4a')
const fs = require('fs')
const isobmff = require('./lib/isobmff')
const matroska = require('./lib/matroska')
const riff = require('./lib/riff')
const xml = require('./lib/xml')

const HEAD_SIZE = 4096

const signature = {
  // containers
  ftyp: [{ sequence: [0x66, 0x74, 0x79, 0x70], offset: 4 }],
  matroska: [{ sequence: [0x1a, 0x45, 0xdf, 0xa3] }],
  riff: [{ sequence: [0x52, 0x49, 0x46, 0x46] }],
  // standalone formats
  bmp: [{ sequence: [0x42, 0x4d] }],
  ico: [{ sequence: [0x00, 0x00, 0x01, 0x00] }],
  jpg: [{ sequence: [0xff, 0xd8, 0xff] }],
  gif: [{ sequence: [0x47, 0x49, 0x46, 0x38] }],
  pdf: [{ sequence: [0x25, 0x50, 0x44, 0x46, 0x2d] }],
  png: [{ sequence: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  svg: [{ sequence: [0x3c, 0x73, 0x76, 0x67] }],
  tiff: [
    { sequence: [0x4d, 0x4d, 0x00, 0x2a] },
    { sequence: [0x49, 0x49, 0x2a, 0x00] }
  ],
  xml: [
    { sequence: [0x3c, 0x3f, 0x78, 0x6d, 0x6c] },
    { sequence: [0xef, 0xbb, 0xbf, 0x3c, 0x3f, 0x78, 0x6d, 0x6c] },
    { sequence: [0xfe, 0xff, 0x00, 0x3c, 0x00, 0x3f] },
    { sequence: [0xff, 0xfe, 0x3c, 0x00, 0x3f, 0x00] }
  ]
}

function head(buffer, end = HEAD_SIZE) {
  if (Buffer.isBuffer(buffer) || ArrayBuffer.isView(buffer)) {
    return buffer.subarray(0, end)
  }
  if (buffer instanceof ArrayBuffer) {
    return b4a.from(buffer.slice(0, end))
  }
}

function toBuffer(buffer) {
  if (Buffer.isBuffer(buffer) || ArrayBuffer.isView(buffer)) return buffer
  if (buffer instanceof ArrayBuffer) return b4a.from(buffer)
}

function startsWith(buffer, sequence, offset = 0) {
  for (let i = 0; i < sequence.length; i++) {
    if (buffer[i + offset] !== sequence[i]) {
      return false
    }
  }
  return true
}

async function readAt(reader, offset, length) {
  const buffer = await reader.read(offset, length)
  return toBuffer(buffer)
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

function getFileFormat(bytes, opts = {}) {
  const buffer = head(bytes)
  const fullBuffer = opts.inspectTracks ? toBuffer(bytes) : null

  const format = lookup(signature, buffer)

  if (format === 'ftyp') {
    return isobmff.detect(buffer, {
      inspectTracks: opts.inspectTracks,
      buffer: fullBuffer
    })
  }

  if (format === 'matroska') {
    return matroska.detect(buffer)
  }

  if (format === 'riff') {
    return riff.detect(buffer)
  }

  if (format === 'xml' || format === 'svg') {
    return xml.detect(format, bytes)
  }

  return format || null
}

async function fromRandomAccessReader(reader) {
  const size = await reader.size()
  const buffer = await readAt(reader, 0, Math.min(HEAD_SIZE, size))
  const format = lookup(signature, buffer)

  if (format === 'ftyp') {
    return isobmff.detectAt(buffer, reader, size)
  }

  if (format === 'matroska') {
    return matroska.detect(buffer)
  }

  if (format === 'riff') {
    return riff.detect(buffer)
  }

  if (format === 'xml' || format === 'svg') {
    return xml.detect(format, buffer)
  }

  return format || null
}

function fromFileDescriptor(fd) {
  return fromRandomAccessReader({
    async size() {
      return fs.fstatSync(fd).size
    },
    async read(offset, length) {
      const buffer = Buffer.allocUnsafe(length)
      const bytesRead = fs.readSync(fd, buffer, 0, length, offset)
      return buffer.subarray(0, bytesRead)
    }
  })
}

async function fromPath(filepath) {
  const fd = fs.openSync(filepath, 'r')

  try {
    return await fromFileDescriptor(fd)
  } finally {
    fs.closeSync(fd)
  }
}

getFileFormat.fromRandomAccessReader = fromRandomAccessReader
getFileFormat.fromFileDescriptor = fromFileDescriptor
getFileFormat.fromPath = fromPath

module.exports = getFileFormat
