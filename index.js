const b4a = require('b4a')

const ftyp = {
  sequence: [0x66, 0x74, 0x79, 0x70],
  offset: 4,
  types: {
    '3g2': [
      { sequence: [0x33, 0x67, 0x32] } // 3g2
    ],
    '3gp': [
      { sequence: [0x33, 0x67, 0x70] } // 3gp
    ],
    avif: [
      { sequence: [0x61, 0x76, 0x69, 0x66] }, // avif
      { sequence: [0x61, 0x76, 0x69, 0x73] }, // avis
      { sequence: [0x61, 0x76, 0x69, 0x66, 0x73] } // avifs
    ],
    cr3: [
      { sequence: [0x63, 0x72, 0x78] } // crx
    ],
    f4v: [
      { sequence: [0x46, 0x34, 0x56] }, // F4V
      { sequence: [0x66, 0x34, 0x76] } // f4v
    ],
    heic: [
      { sequence: [0x68, 0x65, 0x69, 0x63] }, // heic
      { sequence: [0x68, 0x65, 0x69, 0x78] }, // heix
      { sequence: [0x68, 0x65, 0x76, 0x63] }, // hevc
      { sequence: [0x6d, 0x69, 0x66, 0x31] } // mif1
    ],
    heics: [
      { sequence: [0x68, 0x65, 0x76, 0x78] }, // hevx
      { sequence: [0x68, 0x65, 0x69, 0x73] }, // heis
      { sequence: [0x68, 0x65, 0x76, 0x73] } // hevs
    ],
    heifs: [
      { sequence: [0x6d, 0x73, 0x66, 0x31] } // msf1
    ],
    m4a: [{ sequence: [0x4d, 0x34, 0x41] }], // M4A
    m4b: [{ sequence: [0x4d, 0x34, 0x42] }], // M4B
    m4p: [{ sequence: [0x4d, 0x34, 0x50] }], // M4P
    m4v: [{ sequence: [0x4d, 0x34, 0x56] }], // M4V
    mov: [{ sequence: [0x71, 0x74] }], // qt
    mp4: [
      { sequence: [0x69, 0x73, 0x6f, 0x6d] }, // isom
      { sequence: [0x69, 0x73, 0x6f, 0x32] }, // iso2
      { sequence: [0x69, 0x73, 0x6f, 0x33] }, // iso3
      { sequence: [0x6d, 0x70, 0x34, 0x31] }, // mp41
      { sequence: [0x6d, 0x70, 0x34, 0x32] } // mp42
    ]
  }
}

const types = {
  bmp: [{ sequence: [0x42, 0x4d] }],
  ico: [{ sequence: [0x00, 0x00, 0x01, 0x00] }],
  jpg: [{ sequence: [0xff, 0xd8, 0xff] }],
  gif: [{ sequence: [0x47, 0x49, 0x46, 0x38] }],
  png: [{ sequence: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  tiff: [
    { sequence: [0x4d, 0x4d, 0x00, 0x2a] },
    { sequence: [0x49, 0x49, 0x2a, 0x00] }
  ],
  webp: [{ sequence: [0x52, 0x49, 0x46, 0x46] }]
}

function head(buffer, end = 64) {
  if (Buffer.isBuffer(buffer) || ArrayBuffer.isView(buffer)) {
    return buffer.subarray(0, end)
  }
  if (buffer instanceof ArrayBuffer) {
    return b4a.from(buffer.slice(0, end))
  }
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
    for (const { sequence, offset } of types[type]) {
      if (startsWith(buffer, sequence, offset)) {
        return type
      }
    }
  }
  return null
}

module.exports = function getFileFormat(bytes) {
  const buffer = head(bytes)

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

    return null
  }

  // Rest (fixed sequence)
  const type = lookup(types, buffer)

  if (type) {
    return type
  }

  return null
}
