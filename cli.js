#!/usr/bin/env bare
const { header, summary, command, arg, flag } = require('paparam')
const path = require('bare-path')
const getFileFormat = require('.')

const PRINT_BYTE_START_DEFAULT = 0
const PRINT_BYTE_LENGTH_DEFAULT = 32

const cmd = command(
  header('gff (get-file-format)'),
  summary('Detect the format of a file by looking at its magic number 🪄'),
  arg('<path>', 'Path to the file'),
  flag('--verbose|-v', 'Print bytes and other info'),
  flag(
    '--start|-s [byteStart]',
    `Start index of bytes to print in verbose mode. Default ${PRINT_BYTE_START_DEFAULT}`
  ),
  flag(
    '--length|-n [byteLength]',
    `Number of bytes to print in verbose mode. Default ${PRINT_BYTE_LENGTH_DEFAULT}`
  )
)

function log(...args) {
  console.log(...args)
}

function isPrintable(byte) {
  return byte >= 0x20 && byte <= 0x7e
}

function byteLine(hex, separator = '+') {
  let line = ''
  for (let i = 0; i < hex.length; i++) line += hex[i] === ' ' ? separator : '-'
  return line
}

function printBytes(bytes, { start, length }) {
  if (length === 0) return
  const firstBytes = bytes.slice(start, start + length)

  let hex = ''
  let text = ''
  let indexes = ''
  for (const [index, byte] of firstBytes.entries()) {
    hex += byte.toString(16).padStart(2, '0').toUpperCase() + ' '
    text += isPrintable(byte) ? ' ' + String.fromCharCode(byte) + ' ' : '   '
    indexes += (start + index).toString().padStart(2, '0') + ' '
  }

  log(byteLine(hex, '┬'))
  log(hex)
  log(text)
  log(byteLine(hex, '┴'))
  log(indexes)
}

function printFormat(format) {
  log()
  log('Format:', format)
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
    const start = Number(flags.start || PRINT_BYTE_START_DEFAULT)
    const length = Number(flags.length || PRINT_BYTE_LENGTH_DEFAULT)

    const format = getFileFormat(bytes)

    if (flags.verbose) {
      printBytes(bytes, { start, length })
      printFormat(format)
      if (bytes.subarray(4, 8).toString('latin1') === 'ftyp') {
        printFTYP(bytes)
      }
    } else {
      log(format)
    }
  } catch (err) {
    console.error(err)
  }
}

main(cmd.parse() || {})
