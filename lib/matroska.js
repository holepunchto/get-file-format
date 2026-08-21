const { startsWith } = require('./util')

// Matroska detection looks past the EBML header for the DocType element.
const signature = {
  mkv: [
    {
      search: [0x42, 0x82],
      offset: 1,
      sequence: [0x6d, 0x61, 0x74, 0x72, 0x6f, 0x73, 0x6b, 0x61]
    }
  ],
  webm: [
    { search: [0x42, 0x82], offset: 1, sequence: [0x77, 0x65, 0x62, 0x6d] }
  ]
}

function endIndexOf(buffer, search) {
  let last = []

  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === search[last.length]) {
      last.push(buffer[i])
    } else {
      last = []
    }

    if (last.length === search.length) return i + 1
  }

  return -1
}

function detect(buffer) {
  for (const type in signature) {
    for (const { search, sequence, offset = 0 } of signature[type]) {
      const searchIndex = endIndexOf(buffer, search)
      if (searchIndex === -1) return null

      if (startsWith(buffer, sequence, searchIndex + offset)) return type
    }
  }

  return null
}

module.exports = {
  detect
}
