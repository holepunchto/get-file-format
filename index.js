const b4a = require('b4a')

const types = {
  jpg: [
    { sequence: [0xFF, 0xD8, 0xFF] }
  ],
  gif: [
    { sequence: [0x47, 0x49, 0x46, 0x38] }
  ],
  tiff: [
    { sequence: [0x4D, 0x4D, 0x00, 0x2A] },
    { sequence: [0x49, 0x49, 0x2A, 0x00] }
  ],
  webp: [
    { sequence: [0x52, 0x49, 0x46, 0x46] }
  ],
  heic: [
    { sequence: [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63], offset: 4 }
  ],
  png: [
    { sequence: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }
  ]
}

function startsWith (buffer, sequence, offset = 0) {
  for (let i = 0; i < sequence.length; i++) {
    if (buffer[i + offset] !== sequence[i]) {
      return false
    }
  }
  return true
}

module.exports = function getFileFormat (bytes) {
  const buffer = b4a.from(bytes).subarray(0, 16)

  for (const type in types) {
    for (const { sequence, offset } of types[type]) {
      if (startsWith(buffer, sequence, offset)) {
        return type
      }
    }
  }

  return null
}
