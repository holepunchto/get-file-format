const test = require('brittle')
const fs = require('fs')

const getFileFormat = require('..')
const { makeMP4, reader } = require('./helpers')

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

test('inspectTracks: audio-only iso bmff returns m4a', (t) => {
  const buffer = makeMP4({ tracks: ['soun'] })

  t.is(getFileFormat(buffer), 'mp4')
  t.is(getFileFormat(buffer, { inspectTracks: true }), 'm4a')
})

test('inspectTracks: video iso bmff returns mp4', (t) => {
  const video = makeMP4({ tracks: ['vide'] })
  const mixed = makeMP4({ tracks: ['soun', 'vide'] })

  t.is(getFileFormat(video, { inspectTracks: true }), 'mp4')
  t.is(getFileFormat(mixed, { inspectTracks: true }), 'mp4')
})

test('fromPath: audio-only iso bmff returns m4a', async (t) => {
  const filepath = `/tmp/get-file-format-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}.mp4`
  const buffer = makeMP4({ tracks: ['soun'], mdatSize: 1024 * 1024 })

  fs.writeFileSync(filepath, buffer)

  try {
    const result = await getFileFormat.fromPath(filepath)

    t.is(result, 'm4a')
  } finally {
    fs.unlinkSync(filepath)
  }
})

test('fromFileDescriptor: audio-only iso bmff returns m4a', async (t) => {
  const filepath = `/tmp/get-file-format-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}.mp4`
  const buffer = makeMP4({ tracks: ['soun'], mdatSize: 1024 * 1024 })

  fs.writeFileSync(filepath, buffer)

  const fd = fs.openSync(filepath, 'r')
  try {
    const result = await getFileFormat.fromFileDescriptor(fd)

    t.is(result, 'm4a')
  } finally {
    fs.closeSync(fd)
    fs.unlinkSync(filepath)
  }
})

test('fromRandomAccessReader: audio-only iso bmff returns m4a', async (t) => {
  const buffer = makeMP4({ tracks: ['soun'], mdatSize: 1024 * 1024 })
  const file = reader(buffer)

  const result = await getFileFormat.fromRandomAccessReader(file)

  t.is(result, 'm4a')
  t.ok(file.bytesRead < 5000, 'skips mdat without reading payload')
})

test('fromRandomAccessReader: video iso bmff returns mp4', async (t) => {
  const video = makeMP4({ tracks: ['vide'] })
  const file = reader(video)

  const result = await getFileFormat.fromRandomAccessReader(file)

  t.is(result, 'mp4')
})
