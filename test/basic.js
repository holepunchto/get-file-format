const test = require('brittle')

const getFileFormat = require('..')
const { makeMP4 } = require('./helpers/isobmff')
const { makeMatroska } = require('./helpers/matroska')

test('all formats', (t) => {
  const formats = [
    '3g2',
    '3gp',
    'avi',
    'avif',
    'bmp',
    'f4v',
    'gif',
    'heic',
    'ico',
    'jpg',
    'm4v',
    'mkv',
    'mov',
    'mp4',
    'pdf',
    'png',
    'svg',
    'tiff',
    'wav',
    'webm',
    'webp',
    'xml'
  ]

  for (const format of formats) {
    const buffer = require(`./fixtures/sample.${format}`, {
      with: { type: 'binary' }
    })

    const result = getFileFormat(buffer)

    t.is(result, format, format)
  }
})

test('animated formats same extension', (t) => {
  const formats = ['avif', 'webp']

  for (const format of formats) {
    const buffer = require(`./fixtures/animated.${format}`, {
      with: { type: 'binary' }
    })

    const result = getFileFormat(buffer)

    t.is(result, format, format)
  }
})

test('undetected format returns null', (t) => {
  const buffer = require('./fixtures/no-format', {
    with: { type: 'binary' }
  })

  const result = getFileFormat(buffer)

  t.is(result, null)
})

test('matroska detection checks every DocType occurrence', (t) => {
  const overlap = makeMatroska({
    headerPadding: Buffer.from([0x42])
  })
  const decoy = makeMatroska({
    headerPadding: Buffer.from([0x42, 0x82, 0x81, 0x78])
  })

  t.is(getFileFormat(overlap), 'mkv', 'overlapping DocType ID')
  t.is(getFileFormat(decoy), 'mkv', 'DocType ID inside another element')
})

test('svg without xml declaration', (t) => {
  const buffer = require('./fixtures/plain.svg', {
    with: { type: 'binary' }
  })
  const result = getFileFormat(buffer)
  t.is(result, 'svg', 'svg without xml declaration')
})

test('svg larger than head buffer', (t) => {
  const header = Buffer.from(
    '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n<rect width="100" height="100"/>\n'
  )
  const padding = Buffer.alloc(8192, 0x20)
  const closing = Buffer.from('</svg>')
  const buffer = Buffer.concat([header, padding, closing])
  const result = getFileFormat(buffer)
  t.is(result, 'svg', 'svg with closing tag past 4KB head window')
})

test('accepts Uint8Array', (t) => {
  const bytes = new Uint8Array(makeMP4())
  const padded = new Uint8Array(bytes.length + 8)
  padded.set(bytes, 8)

  t.is(getFileFormat(bytes), 'mp4', 'direct input')
  t.is(getFileFormat(padded.subarray(8)), 'mp4', 'non-zero byte offset')
})

test('malformed ftyp size does not scan unrelated bytes', (t) => {
  const malformed = Buffer.alloc(64)
  malformed.writeUInt32BE(0xfffffffc, 0)
  malformed.write('ftyp', 4, 4, 'latin1')
  malformed.write('zzzz', 8, 4, 'latin1')
  malformed.write('mp42', 16, 4, 'latin1')

  const valid = Buffer.from(malformed)
  valid.writeUInt32BE(20, 0)

  t.is(getFileFormat(malformed), null, 'ignores bytes outside an available box')
  t.is(getFileFormat(valid), 'mp4', 'finds a valid compatible brand')
})
