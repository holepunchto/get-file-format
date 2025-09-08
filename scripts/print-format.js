const getFileFormat = require('..')

const [filename] = Bare.argv.slice(2)

const bytes = require(filename, { with: { type: 'binary' } })

const format = getFileFormat(bytes)

console.log()
console.log('Format: ', format)

if (bytes.subarray(4, 8).toString('latin1') === 'ftyp') {
  const size = bytes.subarray(0, 4).readUInt32BE()
  const majorBrand = bytes.subarray(8, 12).toString()
  const minorVersion = bytes.subarray(12, 16).readUInt32BE()
  console.log()
  console.log('ftyp')
  console.log('----')
  console.log('Size:', size)
  console.log('Major brand:', majorBrand)
  console.log('Minor version:', minorVersion)
  const compatibles = []
  for (let i = 16; i < size; i += 4) {
    compatibles.push(bytes.subarray(i, i + 4).toString('latin1'))
  }
  console.log('Compatibles:', compatibles.join(', '))
}

console.log()
