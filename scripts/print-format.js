const getFileFormat = require('..')

function printHeader(bytes) {
  const firstBytes = bytes.slice(0, 20)
  let hex = ''
  let text = ''
  for (const byte of firstBytes) {
    hex += byte + ' '
    text += String.fromCharCode(byte) + ' '
  }
  console.log(hex)
  console.log(text)
}

function printFormat(bytes) {
  const format = getFileFormat(bytes)
  console.log()
  console.log('Format:', format)
}

function printFTYP(bytes) {
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

const args = Bare.argv.slice(2)

if (args.length < 1) {
  console.log('> Missing file argument')
  Bare.exit(1)
}

const filename = args[0]
const bytes = require(filename, { with: { type: 'binary' } })

printHeader(bytes)
printFormat(bytes)
if (bytes.subarray(4, 8).toString('latin1') === 'ftyp') {
  printFTYP(bytes)
}
