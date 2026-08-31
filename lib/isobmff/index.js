const { lookup } = require('../util')
const { toFourCC, inspectTracksAt } = require('./inspect')

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

function countCompatibles(size, length) {
  if (size < 16 || size > length || (size - 16) % 4 !== 0) return 0

  return (size - 16) / 4
}

function getBrandInfo(buffer) {
  const info = {}

  if (buffer.length >= 12) {
    info.majorBrand = toFourCC(buffer, 8, 12)
  }

  const size = buffer.subarray(0, 4).readUInt32BE()
  const compatibleCount = countCompatibles(size, buffer.length)
  if (compatibleCount === 0 && size !== 16) return info

  info.compatibleBrands = []
  for (let i = 0; i < compatibleCount; i++) {
    const index = 16 + i * 4
    const compatible = toFourCC(buffer, index, index + 4)
    info.compatibleBrands.push(compatible)
  }

  return info
}

async function detectAt(buffer, reader, size, opts = {}) {
  const result = { format: detect(buffer) }
  const brandInfo = getBrandInfo(buffer)

  if (brandInfo.majorBrand) {
    result.majorBrand = brandInfo.majorBrand
  }
  if (brandInfo.compatibleBrands) {
    result.compatibleBrands = brandInfo.compatibleBrands
  }

  if (!opts.inspect) return result

  const tracks = await inspectTracksAt(reader, size)
  result.tracks = tracks

  if (result.format === 'mp4' && tracks.audio && !tracks.video) {
    result.format = 'm4a'
  }

  return result
}

function detect(buffer) {
  const size = buffer.subarray(0, 4).readUInt32BE()
  const majorBrand = buffer.subarray(8, 12)
  const format = lookup(ftyp, majorBrand)
  if (format) return format

  const compatibleCount = countCompatibles(size, buffer.length)
  for (let i = 0; i < compatibleCount; i++) {
    const index = 16 + i * 4
    const compatible = buffer.subarray(index, index + 4)
    const format = lookup(ftyp, compatible)
    if (format) return format
  }

  return null
}

module.exports = {
  detect,
  detectAt
}
