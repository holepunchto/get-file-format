function box(type, ...contents) {
  const size =
    8 + contents.reduce((total, content) => total + content.length, 0)
  const header = Buffer.alloc(8)
  header.writeUInt32BE(size)
  header.write(type, 4, 4, 'latin1')

  return Buffer.concat([header, ...contents])
}

function ftyp(...brands) {
  return box(
    'ftyp',
    Buffer.concat([
      Buffer.from('isom', 'latin1'),
      Buffer.alloc(4),
      ...brands.map((brand) => Buffer.from(brand, 'latin1'))
    ])
  )
}

function handler(type) {
  return box(
    'hdlr',
    Buffer.concat([Buffer.alloc(8), Buffer.from(type, 'latin1')])
  )
}

function track(type) {
  return box('trak', box('mdia', handler(type)))
}

function makeMP4({
  tracks = [],
  mdatSize = 0,
  brands = ['isom', 'mp41']
} = {}) {
  const boxes = [ftyp(...brands)]
  if (mdatSize > 0) boxes.push(box('mdat', Buffer.alloc(mdatSize)))
  boxes.push(box('moov', ...tracks.map(track)))

  return Buffer.concat(boxes)
}

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

function makeMKV({
  tracks = [],
  paddingSize = 0,
  docType = 'matroska'
} = {}) {
  const header = element(
    [0x1a, 0x45, 0xdf, 0xa3],
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

module.exports = {
  makeMP4,
  makeMKV
}
