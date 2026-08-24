function vint(value) {
  let length = 1
  while (value > 2 ** (length * 7) - 2) length++

  const buffer = Buffer.alloc(length)
  for (let i = length - 1; i >= 0; i--) {
    buffer[i] = value % 256
    value = Math.floor(value / 256)
  }
  buffer[0] |= 1 << (8 - length)

  return buffer
}

function element(id, ...contents) {
  const content = Buffer.concat(contents)
  return Buffer.concat([Buffer.from(id), vint(content.length), content])
}

function makeFile(
  docType,
  { tracks = [], paddingSize = 0, headerPadding = null } = {}
) {
  const header = element(
    [0x1a, 0x45, 0xdf, 0xa3],
    headerPadding ? element([0xec], headerPadding) : Buffer.alloc(0),
    element([0x42, 0x82], Buffer.from(docType))
  )
  const entries = tracks.map((type) =>
    element([0xae], element([0x83], Buffer.from([type === 'video' ? 1 : 2])))
  )
  const segment = element(
    [0x18, 0x53, 0x80, 0x67],
    paddingSize > 0
      ? element([0xec], Buffer.alloc(paddingSize))
      : Buffer.alloc(0),
    element([0x16, 0x54, 0xae, 0x6b], ...entries)
  )

  return Buffer.concat([header, segment])
}

function makeMatroska(opts) {
  return makeFile('matroska', opts)
}

function makeWebM(opts) {
  return makeFile('webm', opts)
}

module.exports = {
  makeMatroska,
  makeWebM
}
