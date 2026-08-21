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

function toBuffer(buffer) {
  if (Buffer.isBuffer(buffer) || ArrayBuffer.isView(buffer)) return buffer
  if (buffer instanceof ArrayBuffer) return Buffer.from(buffer)
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

function toFourCC(buffer, start, end) {
  return buffer.subarray(start, end).toString('latin1')
}

function readUInt64BE(buffer, offset) {
  const high = buffer.subarray(offset, offset + 4).readUInt32BE()
  const low = buffer.subarray(offset + 4, offset + 8).readUInt32BE()
  return high * 0x100000000 + low
}

function readBox(buffer, offset, end) {
  if (offset + 8 > end) return null

  let size = buffer.subarray(offset, offset + 4).readUInt32BE()
  const type = toFourCC(buffer, offset + 4, offset + 8)
  let headerSize = 8

  if (size === 1) {
    if (offset + 16 > end) return null
    size = readUInt64BE(buffer, offset + 8)
    headerSize = 16
  } else if (size === 0) {
    size = end - offset
  }

  if (type === 'uuid') headerSize += 16

  const boxEnd = offset + size
  if (size < headerSize || boxEnd > end) return null

  return {
    type,
    contentStart: offset + headerSize,
    end: boxEnd
  }
}

async function readAt(reader, offset, length) {
  const buffer = await reader.read(offset, length)
  return toBuffer(buffer)
}

async function readBoxAt(reader, offset, end) {
  if (offset + 8 > end) return null

  const header = await readAt(reader, offset, 8)
  if (header.length < 8) return null

  let size = header.subarray(0, 4).readUInt32BE()
  const type = toFourCC(header, 4, 8)
  let headerSize = 8

  if (size === 1) {
    const extended = await readAt(reader, offset + 8, 8)
    if (extended.length < 8) return null
    size = readUInt64BE(extended, 0)
    headerSize = 16
  } else if (size === 0) {
    size = end - offset
  }

  if (type === 'uuid') headerSize += 16

  const boxEnd = offset + size
  if (size < headerSize || boxEnd > end) return null

  return {
    type,
    contentStart: offset + headerSize,
    end: boxEnd
  }
}

function findChildBox(buffer, start, end, type) {
  for (let offset = start; offset + 8 <= end; ) {
    const box = readBox(buffer, offset, end)
    if (!box) return null
    if (box.type === type) return box
    offset = box.end
  }

  return null
}

async function findChildBoxAt(reader, start, end, type) {
  for (let offset = start; offset + 8 <= end; ) {
    const box = await readBoxAt(reader, offset, end)
    if (!box) return null
    if (box.type === type) return box
    offset = box.end
  }

  return null
}

function inspectTracks(buffer) {
  const tracks = {
    audio: false,
    video: false
  }

  for (let offset = 0; offset + 8 <= buffer.length; ) {
    const box = readBox(buffer, offset, buffer.length)
    if (!box) return tracks

    if (box.type === 'moov') {
      inspectMovieBox(buffer, box.contentStart, box.end, tracks)
      return tracks
    }

    offset = box.end
  }

  return tracks
}

async function inspectTracksAt(reader, size) {
  const tracks = {
    audio: false,
    video: false
  }

  for (let offset = 0; offset + 8 <= size; ) {
    const box = await readBoxAt(reader, offset, size)
    if (!box) return tracks

    if (box.type === 'moov') {
      await inspectMovieBoxAt(reader, box.contentStart, box.end, tracks)
      return tracks
    }

    offset = box.end
  }

  return tracks
}

function inspectMovieBox(buffer, start, end, tracks) {
  for (let offset = start; offset + 8 <= end; ) {
    const trak = readBox(buffer, offset, end)
    if (!trak) return

    if (trak.type === 'trak') {
      const handler = getTrackHandler(buffer, trak.contentStart, trak.end)
      if (handler === 'soun') tracks.audio = true
      if (handler === 'vide') tracks.video = true
    }

    offset = trak.end
  }
}

async function inspectMovieBoxAt(reader, start, end, tracks) {
  for (let offset = start; offset + 8 <= end; ) {
    const trak = await readBoxAt(reader, offset, end)
    if (!trak) return

    if (trak.type === 'trak') {
      const handler = await getTrackHandlerAt(
        reader,
        trak.contentStart,
        trak.end
      )
      if (handler === 'soun') tracks.audio = true
      if (handler === 'vide') tracks.video = true
    }

    offset = trak.end
  }
}

function getTrackHandler(buffer, start, end) {
  const mdia = findChildBox(buffer, start, end, 'mdia')
  if (!mdia) return null

  const hdlr = findChildBox(buffer, mdia.contentStart, mdia.end, 'hdlr')
  if (!hdlr || hdlr.contentStart + 12 > hdlr.end) return null

  return toFourCC(buffer, hdlr.contentStart + 8, hdlr.contentStart + 12)
}

async function getTrackHandlerAt(reader, start, end) {
  const mdia = await findChildBoxAt(reader, start, end, 'mdia')
  if (!mdia) return null

  const hdlr = await findChildBoxAt(reader, mdia.contentStart, mdia.end, 'hdlr')
  if (!hdlr || hdlr.contentStart + 12 > hdlr.end) return null

  const data = await readAt(reader, hdlr.contentStart, 12)
  if (data.length < 12) return null

  return toFourCC(data, 8, 12)
}

function refine(format, opts) {
  if (!opts.inspectTracks || format !== 'mp4' || !opts.buffer) return format

  const tracks = inspectTracks(opts.buffer)
  if (tracks.audio && !tracks.video) return 'm4a'

  return format
}

async function refineAt(format, reader, size) {
  if (format !== 'mp4') return format

  const tracks = await inspectTracksAt(reader, size)
  if (tracks.audio && !tracks.video) return 'm4a'

  return format
}

function detect(buffer, opts = {}) {
  const size = buffer.subarray(0, 4).readUInt32BE()
  const majorBrand = buffer.subarray(8, 12)
  const format = lookup(ftyp, majorBrand)
  if (format) return refine(format, opts)

  const compatibleCount = Math.max(0, (size - 16) / 4)
  for (let i = 0; i < compatibleCount; i++) {
    const index = 16 + i * 4
    const compatible = buffer.subarray(index, index + 4)
    const format = lookup(ftyp, compatible)
    if (format) return refine(format, opts)
  }

  return null
}

async function detectAt(buffer, reader, size) {
  const boxSize = buffer.subarray(0, 4).readUInt32BE()
  const majorBrand = buffer.subarray(8, 12)
  const format = lookup(ftyp, majorBrand)
  if (format) return refineAt(format, reader, size)

  const compatibleCount = Math.max(0, (boxSize - 16) / 4)
  for (let i = 0; i < compatibleCount; i++) {
    const index = 16 + i * 4
    const compatible = buffer.subarray(index, index + 4)
    const format = lookup(ftyp, compatible)
    if (format) return refineAt(format, reader, size)
  }

  return null
}

module.exports = {
  detect,
  detectAt
}
