const test = require('brittle')

const getFileFormat = require('..')

test('all formats', t => {
  const formats = [
    'heic',
    'jpg',
    'png',
    'tiff',
    'webp'
  ]

  for (const format of formats) {
    const buffer = require(`./fixtures/sample.${format}`, { with: { type: 'binary' } })

    const result = getFileFormat(buffer)

    t.is(result, format)
  }
})
