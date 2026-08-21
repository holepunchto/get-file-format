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

function reader(buffer) {
  return {
    bytesRead: 0,
    async size() {
      return buffer.length
    },
    async read(offset, length) {
      const chunk = buffer.subarray(
        offset,
        Math.min(offset + length, buffer.length)
      )
      this.bytesRead += chunk.length
      return chunk
    }
  }
}

module.exports = {
  makeMP4,
  reader
}
