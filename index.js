const b4a = require('b4a')

const ftyp = {
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

// matroska detection can be improved by looking at the bytes after [0x42, 0x82],
// a variable integer (VINT) which indicates the length of the doctype [matroska, webm]
const matroska = {
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

const riff = {
  avi: [{ sequence: [0x41, 0x56, 0x49, 0x20], offset: 8 }],
  webp: [{ sequence: [0x57, 0x45, 0x42, 0x50], offset: 8 }],
  wav: [{ sequence: [0x57, 0x41, 0x56, 0x45], offset: 8 }]
}

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

function head(buffer, end = 4096) {
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

function endIndexOf(buffer, search) {
  let last = []

  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === search[last.length]) {
      last.push(buffer[i])
    } else {
      last = []
    }
    if (last.length === search.length) {
      return i + 1
    }
  }

  return -1
}

function lookup(types, buffer) {
  for (const type in types) {
    for (const { search, sequence, offset = 0 } of types[type]) {
      let searchIndex = 0
      if (search) {
        searchIndex = endIndexOf(buffer, search)
        if (searchIndex === -1) return null
      }
      if (startsWith(buffer, sequence, searchIndex + offset)) {
        return type
      }
    }
  }
  return null
}
const TAG_SVG_OPEN = b4a.from('<svg')
const TAG_SVG_CLOSE = b4a.from('</svg>')
const TAG_BOUNDARIES = [
  0x20, // space
  0x3e, // >
  0x0a, // \n
  0x09, // \t
  0x0d, // \r
  0x2f // /  (for <tag/>)
]

function isLikelySvg(buffer) {
  const openIndex = b4a.indexOf(buffer, TAG_SVG_OPEN)
  if (openIndex === -1) return false

  const nextByte = buffer[openIndex + 4]
  if (nextByte && !TAG_BOUNDARIES.includes(nextByte)) return false

  const closeIndex = b4a.lastIndexOf(buffer, TAG_SVG_CLOSE)
  return closeIndex > openIndex
}

function isobmff(buffer) {
  // check major brand
  const size = buffer.subarray(0, 4).readUInt32BE()
  const majorBrand = buffer.subarray(8, 12)
  const format = lookup(ftyp, majorBrand)
  if (format) {
    return format
  }

  // check compatibles
  const compatibleCount = Math.max(0, (size - 16) / 4)
  for (let i = 0; i < compatibleCount; i++) {
    const index = 16 + i * 4
    const compatible = buffer.subarray(index, index + 4)
    const format = lookup(ftyp, compatible)
    if (format) {
      return format
    }
  }

  return null
}

module.exports = function getFileFormat(bytes) {
  const buffer = head(bytes)

  const format = lookup(signature, buffer)

  if (format === 'ftyp') {
    return isobmff(buffer)
  }

  if (format === 'matroska') {
    return lookup(matroska, buffer)
  }

  if (format === 'riff') {
    return lookup(riff, buffer)
  }

  if (format === 'xml') {
    if (isLikelySvg(buffer)) return 'svg'
    return 'xml'
  }

  return format || null
}
