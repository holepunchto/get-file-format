const test = require('brittle')
const fs = require('bare-fs')

const getFileFormat = require('..')
const { makeMP4 } = require('./helpers/isobmff')
const { makeMatroska, makeWebM } = require('./helpers/matroska')

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

test('fromPath: optionally inspects ISOBMFF tracks', async (t) => {
  const filepath = `/tmp/get-file-format-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}.mp4`
  const buffer = makeMP4({ tracks: ['soun'], mdatSize: 1024 * 1024 })

  fs.writeFileSync(filepath, buffer)

  try {
    const format = await getFileFormat.fromPath(filepath)
    const inspectedFormat = await getFileFormat.fromPath(filepath, {
      inspectTracks: true
    })

    t.is(format, 'mp4')
    t.is(inspectedFormat, 'm4a')
  } finally {
    fs.unlinkSync(filepath)
  }
})

test('fromPath: optionally inspects Matroska tracks', async (t) => {
  const cases = [
    {
      make: makeMatroska,
      tracks: ['audio'],
      baseFormat: 'mkv',
      expected: 'mka'
    },
    {
      make: makeMatroska,
      tracks: ['video'],
      baseFormat: 'mkv',
      expected: 'mkv'
    },
    {
      make: makeMatroska,
      tracks: ['audio', 'video'],
      baseFormat: 'mkv',
      expected: 'mkv'
    },
    {
      make: makeWebM,
      tracks: ['audio'],
      baseFormat: 'webm',
      expected: 'webm'
    }
  ]

  for (const { make, tracks, baseFormat, expected } of cases) {
    const filepath = `/tmp/get-file-format-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.${expected}`
    const buffer = make({
      tracks,
      paddingSize: 1024 * 1024
    })

    fs.writeFileSync(filepath, buffer)

    try {
      const format = await getFileFormat.fromPath(filepath)
      const inspectedFormat = await getFileFormat.fromPath(filepath, {
        inspectTracks: true
      })

      t.is(format, baseFormat)
      t.is(inspectedFormat, expected)
    } finally {
      fs.unlinkSync(filepath)
    }
  }
})

test('accepts Uint8Array', (t) => {
  const bytes = new Uint8Array(makeMP4())
  const padded = new Uint8Array(bytes.length + 8)
  padded.set(bytes, 8)

  t.is(getFileFormat(bytes), 'mp4', 'direct input')
  t.is(getFileFormat(padded.subarray(8)), 'mp4', 'non-zero byte offset')
})

test('malformed ftyp size is bounded by the buffer', (t) => {
  // Header claims 4 GB long when it's in 64 bytes. The lookup must stop at the buffer, not this size
  const malformed = Buffer.alloc(64)
  malformed.writeUInt32BE(0xffffffff, 0)
  malformed.write('ftyp', 4, 4, 'latin1')
  malformed.write('zzzz', 8, 4, 'latin1')
  malformed.write('qqqq', 16, 4, 'latin1')

  const known = Buffer.from(malformed)
  known.write('mp42', 16, 4, 'latin1')

  const start = Date.now()

  t.is(getFileFormat(malformed), null, 'nothing to find')
  t.is(getFileFormat(known), 'mp4', 'brands inside the buffer still found')
  t.ok(Date.now() - start < 1000, 'bounded by the buffer, not the box size')
})
