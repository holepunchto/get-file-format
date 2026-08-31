const test = require('brittle')
const fs = require('bare-fs')

const getFileFormat = require('..')
const { makeMP4 } = require('./helpers/isobmff')
const { makeMatroska, makeWebM } = require('./helpers/matroska')
const { tmpPath } = require('./helpers/util')

test('fromPath: all formats', async (t) => {
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
    const result = await getFileFormat.fromPath(`./test/fixtures/sample.${format}`)

    t.is(result.format, format, format)
  }
})


test.solo('fromPath: with inspection', async (t) => {
  const formats = ['3g2', '3gp', 'f4v', 'm4v', 'mkv', 'mov', 'mp4', 'webm']

  for (const format of formats) {
    const result = await getFileFormat.fromPath(`./test/fixtures/sample.${format}`, {
      inspect: true
    })

    t.is(result.format, format, `${format}: format`)
    t.is(typeof result.tracks.audio, 'boolean', `${format}: tracks.audio`)
    t.is(typeof result.tracks.video, 'boolean', `${format}: tracks.video`)
  }
})

test('fromPath: optionally inspects ISOBMFF tracks', async (t) => {
  const cases = [
    { name: 'audio-only', tracks: ['soun'], expected: 'm4a' },
    { name: 'video-only', tracks: ['vide'], expected: 'mp4' },
    { name: 'mixed', tracks: ['soun', 'vide'], expected: 'mp4' },
    { name: 'no tracks', tracks: [], expected: 'mp4' },
    { name: 'unknown handler', tracks: ['meta'], expected: 'mp4' }
  ]

  for (const { name, tracks, expected } of cases) {
    const filepath = tmpPath(expected)
    const buffer = makeMP4({ tracks, mdatSize: 1024 * 1024 })

    fs.writeFileSync(filepath, buffer)

    try {
      const result = await getFileFormat.fromPath(filepath)
      const inspected = await getFileFormat.fromPath(filepath, {
        inspect: true
      })

      t.alike(
        result,
        {
          format: 'mp4',
          majorBrand: 'isom',
          compatibleBrands: ['isom', 'mp41']
        },
        `${name}: default`
      )
      t.alike(
        inspected,
        {
          format: expected,
          majorBrand: 'isom',
          compatibleBrands: ['isom', 'mp41'],
          tracks: {
            audio: tracks.includes('soun'),
            video: tracks.includes('vide')
          }
        },
        `${name}: inspected`
      )
    } finally {
      fs.unlinkSync(filepath)
    }
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
      make: makeMatroska,
      tracks: [],
      baseFormat: 'mkv',
      expected: 'mkv'
    },
    {
      make: makeWebM,
      tracks: ['audio'],
      baseFormat: 'webm',
      expected: 'webm'
    },
    {
      make: makeWebM,
      tracks: ['video'],
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
      const result = await getFileFormat.fromPath(filepath)
      const inspected = await getFileFormat.fromPath(filepath, {
        inspect: true
      })

      t.alike(result, {
        format: baseFormat,
        docType: baseFormat === 'webm' ? 'webm' : 'matroska'
      })
      t.alike(inspected, {
        format: expected,
        docType: baseFormat === 'webm' ? 'webm' : 'matroska',
        tracks: {
          audio: tracks.includes('audio'),
          video: tracks.includes('video')
        }
      })
    } finally {
      fs.unlinkSync(filepath)
    }
  }
})
