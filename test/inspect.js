const test = require('brittle')
const fs = require('bare-fs')

const getFileFormat = require('..')
const { makeMP4 } = require('./helpers/isobmff')
const { makeMatroska, makeWebM } = require('./helpers/matroska')
const { tmpPath } = require('./helpers/util')

test('fromPath: optionally inspects ISOBMFF tracks', async (t) => {
  const filepath = tmpPath('mp4')
  const buffer = makeMP4({ tracks: ['soun'], mdatSize: 1024 * 1024 })

  fs.writeFileSync(filepath, buffer)

  try {
    const format = await getFileFormat.fromPath(filepath)
    const inspectedFormat = await getFileFormat.fromPath(filepath, {
      inspect: true
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
    const filepath = tmpPath(expected)
    const buffer = make({
      tracks,
      paddingSize: 1024 * 1024
    })

    fs.writeFileSync(filepath, buffer)

    try {
      const format = await getFileFormat.fromPath(filepath)
      const inspectedFormat = await getFileFormat.fromPath(filepath, {
        inspect: true
      })

      t.is(format, baseFormat)
      t.is(inspectedFormat, expected)
    } finally {
      fs.unlinkSync(filepath)
    }
  }
})
