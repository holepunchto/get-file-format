const { readAt } = require('../util')

const UINT32_LENGTH = 4
const UINT64_LENGTH = 8
const BOX_HEADER_LENGTH = 8
const BOX_TYPE_OFFSET = 4
const UUID_LENGTH = 16
const HANDLER_TYPE_OFFSET = 8

function toFourCC(buffer, start, end) {
  return buffer.subarray(start, end).toString('latin1')
}

function readUInt64BE(buffer, offset) {
  const high = buffer.subarray(offset, offset + UINT32_LENGTH).readUInt32BE()
  const low = buffer.subarray(offset + UINT32_LENGTH, offset + UINT64_LENGTH).readUInt32BE()
  return high * 0x100000000 + low
}

async function readBoxAt(reader, offset, end) {
  if (offset + BOX_HEADER_LENGTH > end) return null

  const header = await readAt(reader, offset, BOX_HEADER_LENGTH)
  if (header.length < BOX_HEADER_LENGTH) return null

  let size = header.subarray(0, UINT32_LENGTH).readUInt32BE()
  const type = toFourCC(header, BOX_TYPE_OFFSET, BOX_HEADER_LENGTH)
  let headerSize = BOX_HEADER_LENGTH

  if (size === 1) {
    const extended = await readAt(reader, offset + BOX_HEADER_LENGTH, UINT64_LENGTH)
    if (extended.length < UINT64_LENGTH) return null
    size = readUInt64BE(extended, 0)
    headerSize = BOX_HEADER_LENGTH + UINT64_LENGTH
  } else if (size === 0) {
    size = end - offset
  }

  if (type === 'uuid') headerSize += UUID_LENGTH

  const boxEnd = offset + size
  if (size < headerSize || boxEnd > end) return null

  return {
    type,
    contentStart: offset + headerSize,
    end: boxEnd
  }
}

async function findChildBoxAt(reader, start, end, type) {
  for (let offset = start; offset + BOX_HEADER_LENGTH <= end;) {
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

  for (let offset = 0; offset + BOX_HEADER_LENGTH <= size;) {
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
  for (let offset = start; offset + BOX_HEADER_LENGTH <= end;) {
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

  const handler = await findChildBoxAt(reader, mdia.contentStart, mdia.end, 'hdlr')
  const handlerTypeEnd = HANDLER_TYPE_OFFSET + UINT32_LENGTH
  if (!handler || handler.contentStart + handlerTypeEnd > handler.end) return null

  const data = await readAt(reader, handler.contentStart, handlerTypeEnd)
  if (data.length < handlerTypeEnd) return null

  return toFourCC(data, HANDLER_TYPE_OFFSET, handlerTypeEnd)
}

module.exports.toFourCC = toFourCC
module.exports.inspectTracksAt = inspectTracksAt
