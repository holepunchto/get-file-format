const test = require('brittle')

const getFileFormat = require('..')

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
