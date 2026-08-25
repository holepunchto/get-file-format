const { readAt } = require('../util')

function toFourCC(buffer, start, end) {
  return buffer.subarray(start, end).toString('latin1')
}

function readUInt64BE(buffer, offset) {
  const high = buffer.subarray(offset, offset + 4).readUInt32BE()
  const low = buffer.subarray(offset + 4, offset + 8).readUInt32BE()
  return high * 0x100000000 + low
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

async function findChildBoxAt(reader, start, end, type) {
  for (let offset = start; offset + 8 <= end;) {
    const box = await readBoxAt(reader, offset, end)
    if (!box) return null
    if (box.type === type) return box
    offset = box.end
  }

  return null
}

async function inspectTracksAt(reader, size) {
  const tracks = {
    audio: false,
    video: false
  }

  for (let offset = 0; offset + 8 <= size;) {
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

async function inspectMovieBoxAt(reader, start, end, tracks) {
  for (let offset = start; offset + 8 <= end;) {
    const trak = await readBoxAt(reader, offset, end)
    if (!trak) return

    if (trak.type === 'trak') {
      const handler = await getTrackHandlerAt(reader, trak.contentStart, trak.end)
      if (handler === 'soun') tracks.audio = true
      if (handler === 'vide') tracks.video = true
    }

    offset = trak.end
  }
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

module.exports = inspectTracksAt
