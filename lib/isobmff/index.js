const { lookup } = require('../util')
const { toFourCC, inspectTracksAt } = require('./inspect')

const BOX_SIZE_LENGTH = 4
const BRAND_LENGTH = 4
const MAJOR_BRAND_OFFSET = 8
const COMPATIBLE_BRANDS_OFFSET = 16

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
  if (
    size < COMPATIBLE_BRANDS_OFFSET ||
    size > length ||
    (size - COMPATIBLE_BRANDS_OFFSET) % BRAND_LENGTH !== 0
  ) {
    return 0
  }

  return (size - COMPATIBLE_BRANDS_OFFSET) / BRAND_LENGTH
}

function getBrandInfo(buffer) {
  const info = {}

  if (buffer.length >= MAJOR_BRAND_OFFSET + BRAND_LENGTH) {
    info.majorBrand = toFourCC(buffer, MAJOR_BRAND_OFFSET, MAJOR_BRAND_OFFSET + BRAND_LENGTH)
  }

  const size = buffer.subarray(0, BOX_SIZE_LENGTH).readUInt32BE()
  const compatibleCount = countCompatibles(size, buffer.length)
  if (compatibleCount === 0 && size !== COMPATIBLE_BRANDS_OFFSET) return info

  info.compatibleBrands = []
  for (let i = 0; i < compatibleCount; i++) {
    const index = COMPATIBLE_BRANDS_OFFSET + i * BRAND_LENGTH
    const compatible = toFourCC(buffer, index, index + BRAND_LENGTH)
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
  const size = buffer.subarray(0, BOX_SIZE_LENGTH).readUInt32BE()
  const majorBrand = buffer.subarray(MAJOR_BRAND_OFFSET, MAJOR_BRAND_OFFSET + BRAND_LENGTH)
  const format = lookup(ftyp, majorBrand)
  if (format) return format

  const compatibleCount = countCompatibles(size, buffer.length)
  for (let i = 0; i < compatibleCount; i++) {
    const index = COMPATIBLE_BRANDS_OFFSET + i * BRAND_LENGTH
    const compatible = buffer.subarray(index, index + BRAND_LENGTH)
    const format = lookup(ftyp, compatible)
    if (format) return format
  }

  return null
}

module.exports = {
  detect,
  detectAt
}
