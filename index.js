const b4a = require('b4a')

const ftyp = {
  sequence: [0x66, 0x74, 0x79, 0x70],
  offset: 4,
  types: {
    avif: [{ sequence: [0x61, 0x76, 0x69, 0x66] }],
    avifs: [{ sequence: [0x61, 0x76, 0x69, 0x66, 0x73] }], // avis
    heic: [
      { sequence: [0x68, 0x65, 0x69, 0x63] }, // heic
      { sequence: [0x68, 0x65, 0x69, 0x78] }, // heix
      { sequence: [0x68, 0x65, 0x76, 0x63] } // hevc
    ],
    heics: [
      { sequence: [0x68, 0x65, 0x76, 0x78] }, // hevx
      { sequence: [0x68, 0x65, 0x69, 0x73] }, // heis
      { sequence: [0x68, 0x65, 0x76, 0x73] } // hevs
    ],
    heifs: [
      { sequence: [0x6d, 0x73, 0x66, 0x31] } // msf1
    ]
  }
}

const types = {
  bmp: [{ sequence: [0x42, 0x4D] }],
  ico: [{ sequence: [0x00, 0x00, 0x01, 0x00] }],
  jpg: [{ sequence: [0xFF, 0xD8, 0xFF] }],
  gif: [{ sequence: [0x47, 0x49, 0x46, 0x38] }],
  png: [{ sequence: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }],
  tiff: [{ sequence: [0x4D, 0x4D, 0x00, 0x2A] }, { sequence: [0x49, 0x49, 0x2A, 0x00] }],
  webp: [{ sequence: [0x52, 0x49, 0x46, 0x46] }]
}

function startsWith (buffer, sequence, offset = 0) {
  for (let i = 0; i < sequence.length; i++) {
    if (buffer[i + offset] !== sequence[i]) {
      return false
    }
  }
  return true
}

function lookup (types, buffer) {
  for (const type in types) {
    for (const { sequence, offset } of types[type]) {
      if (startsWith(buffer, sequence, offset)) {
        return type
      }
    }
  }
  return null
}

module.exports = function getFileFormat (bytes) {
  const buffer = b4a.from(bytes).subarray(0, 64)

  // ISOBMFF
  if (startsWith(buffer, ftyp.sequence, ftyp.offset)) {
    // check major brand
    const size = buffer.subarray(0, 4).readUInt32BE()
    const majorBrand = buffer.subarray(8, 12)
    const type = lookup(ftyp.types, majorBrand)
    if (type) {
      return type
    }

    // check compatibles
    const compatibleCount = Math.max(0, (size - 16) / 4)
    for (let i = 0; i < compatibleCount; i++) {
      const index = 16 + i * 4
      const compatible = buffer.subarray(index, index + 4)
      const type = lookup(ftyp.types, compatible)
      if (type) {
        return type
      }
    }

    return 'heif'
  }

  // Rest (fixed sequence)
  const type = lookup(types, buffer)

  if (type) {
    return type
  }

  return null
}
