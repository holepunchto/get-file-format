#!/usr/bin/env bare
const { header, summary, command, arg, flag } = require('paparam')
const path = require('bare-path')
const getFileFormat = require('.')

const NUM_BYTES_DEFAULT = 24

const cmd = command(
  header('gff (get-file-format)'),
  summary('Detect the format of a file by looking at its magic number 🪄'),
  arg('<path>', 'Path to the file'),
  flag('--bytes|-n [numBytes]', `Number of bytes to print. Default ${NUM_BYTES_DEFAULT}`),
)

function log (...args) {
  console.log(...args)
}

function printHeader(bytes, numBytes) {
  if (numBytes === 0) return
  const firstBytes = bytes.slice(0, numBytes)

  let hex = ''
  let text = ''
  for (const byte of firstBytes) {
    hex += byte + ' '
    text += String.fromCharCode(byte) + ' '
  }
  let line = ''
  for (let i = 0; i < hex.length; i++) line += '-'

  log('+', line)
  log('|', hex)
  log('|', text)
  log('+', line)
}

function printFormat(bytes) {
  log()
  log('Format:', getFileFormat(bytes))
}

function printFTYP(bytes) {
  const size = bytes.subarray(0, 4).readUInt32BE()
  const majorBrand = bytes.subarray(8, 12).toString()
  const minorVersion = bytes.subarray(12, 16).readUInt32BE()

  log()
  log('ftyp')
  log('----')
  log('Size:', size)
  log('Major brand:', majorBrand)
  log('Minor version:', minorVersion)

  const compatibles = []
  for (let i = 16; i < size; i += 4) {
    compatibles.push(bytes.subarray(i, i + 4).toString('latin1'))
  }

  log('Compatibles:', compatibles.join(', '))
}

async function main({ args, flags }) {
  try {
    if (!args?.path) return

    const bytes = require(path.resolve(args.path), { with: { type: 'binary' } })
    const numBytes = Number(flags.bytes || NUM_BYTES_DEFAULT)

    printHeader(bytes, numBytes)
    printFormat(bytes)
    if (bytes.subarray(4, 8).toString('latin1') === 'ftyp') {
      printFTYP(bytes)
    }
  } catch (err) {
    console.error(err)
  }
}

main(cmd.parse() || {})
