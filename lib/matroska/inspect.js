const { readAt } = require('../util')

const SEGMENT_ID = 0x18538067
const TRACKS_ID = 0x1654ae6b
const TRACK_ENTRY_ID = 0xae
const TRACK_TYPE_ID = 0x83

const VIDEO_TRACK = 1
const AUDIO_TRACK = 2

function readVint(buffer, offset, maxLength, removeMarker) {
  const first = buffer[offset]
  if (!first) return null

  let length = 1
  let mask = 0x80

  while (length <= maxLength && (first & mask) === 0) {
    length++
    mask >>= 1
  }

  if (length > maxLength || offset + length > buffer.length) return null

  let value = removeMarker ? first & (mask - 1) : first
  let unknown = removeMarker && value === mask - 1

  for (let i = 1; i < length; i++) {
    const byte = buffer[offset + i]
    value = value * 256 + byte
    unknown = unknown && byte === 0xff
  }

  if (!unknown && !Number.isSafeInteger(value)) return null

  return {
    length,
    value,
    unknown
  }
}

async function readElementAt(reader, offset, end) {
  if (offset >= end) return null

  const header = await readAt(reader, offset, Math.min(12, end - offset))
  const id = readVint(header, 0, 4, false)
  if (!id) return null

  const size = readVint(header, id.length, 8, true)
  if (!size) return null

  const contentStart = offset + id.length + size.length
  if (contentStart > end) return null

  const elementEnd = size.unknown ? end : contentStart + size.value
  if (elementEnd > end) return null

  return {
    id: id.value,
    contentStart,
    end: elementEnd
  }
}

async function findElementAt(reader, start, end, id) {
  for (let offset = start; offset < end;) {
    const element = await readElementAt(reader, offset, end)
    if (!element) return null
    if (element.id === id) return element
    offset = element.end
  }

  return null
}

async function readUnsignedAt(reader, start, end) {
  const length = end - start
  if (length < 1 || length > 8) return null

  const buffer = await readAt(reader, start, length)
  if (buffer.length < length) return null

  let value = 0
  for (const byte of buffer) value = value * 256 + byte

  return Number.isSafeInteger(value) ? value : null
}

async function inspectTracksAt(reader, size) {
  const tracks = {
    audio: false,
    video: false
  }

  const segment = await findElementAt(reader, 0, size, SEGMENT_ID)
  if (!segment) return tracks

  const trackList = await findElementAt(reader, segment.contentStart, segment.end, TRACKS_ID)
  if (!trackList) return tracks

  for (let offset = trackList.contentStart; offset < trackList.end;) {
    const entry = await readElementAt(reader, offset, trackList.end)
    if (!entry) return tracks

    if (entry.id === TRACK_ENTRY_ID) {
      const type = await findElementAt(reader, entry.contentStart, entry.end, TRACK_TYPE_ID)

      if (type) {
        const value = await readUnsignedAt(reader, type.contentStart, type.end)
        if (value === AUDIO_TRACK) tracks.audio = true
        if (value === VIDEO_TRACK) tracks.video = true
      }
    }

    if (tracks.audio && tracks.video) return tracks
    offset = entry.end
  }

  return tracks
}

module.exports.inspectTracksAt = inspectTracksAt
