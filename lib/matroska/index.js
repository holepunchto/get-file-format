const { startsWith } = require('../util')
const { inspectTracksAt } = require('./inspect')

const signature = {
  mkv: [
    {
      search: [0x42, 0x82],
      offset: 1,
      sequence: [0x6d, 0x61, 0x74, 0x72, 0x6f, 0x73, 0x6b, 0x61]
    }
  ],
  webm: [{ search: [0x42, 0x82], offset: 1, sequence: [0x77, 0x65, 0x62, 0x6d] }]
}

async function detectAt(buffer, reader, size, opts = {}) {
  const format = detect(buffer)
  const result = { format }

  if (format === 'mkv') result.docType = 'matroska'
  if (format === 'webm') result.docType = 'webm'

  if (!opts.inspect) return result

  const tracks = await inspectTracksAt(reader, size)
  result.tracks = tracks

  if (format === 'mkv' && tracks.audio && !tracks.video) {
    result.format = 'mka'
  }

  return result
}

function detect(buffer) {
  for (const type in signature) {
    for (const { search, sequence, offset = 0 } of signature[type]) {
      for (let i = 0; i < buffer.length; i++) {
        if (!startsWith(buffer, search, i)) continue

        const sequenceIndex = i + search.length + offset
        if (startsWith(buffer, sequence, sequenceIndex)) return type
      }
    }
  }

  return null
}

module.exports = {
  detect,
  detectAt
}
