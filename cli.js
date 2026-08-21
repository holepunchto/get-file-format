#!/usr/bin/env node
const { header, summary, command, arg, flag } = require('paparam')
const fs = require('fs')
const path = require('path')
const getFileFormat = require('.')

const HEAD_SIZE = 4096
const PRINT_BYTE_START_DEFAULT = 0
const PRINT_BYTE_LENGTH_DEFAULT = 32

const cmd = command(
  header('gff (get-file-format)'),
  summary('Detect the format of a file by looking at its magic number 🪄'),
  arg('<path>', 'Path to the file'),
  flag('--verbose|-v', 'Print bytes and other info'),
  flag(
    '--inspect-tracks|-i',
    'Inspect tracks in media files to distinguish audio-only files'
  ),
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

function readHead(fs, filepath) {
  const fd = fs.openSync(filepath, 'r')

  try {
    const buffer = Buffer.allocUnsafe(HEAD_SIZE)
    const bytesRead = fs.readSync(fd, buffer, 0, HEAD_SIZE, 0)
    return buffer.subarray(0, bytesRead)
  } finally {
    fs.closeSync(fd)
  }
}

async function main({ args, flags }) {
  try {
    if (!args?.path) return

    const filepath = path.resolve(args.path)
    const inspectTracks = flags.inspectTracks
    const start = Number(flags.start || PRINT_BYTE_START_DEFAULT)
    const length = Number(flags.length || PRINT_BYTE_LENGTH_DEFAULT)
    const bytes =
      flags.verbose || !inspectTracks ? readHead(fs, filepath) : null

    const format = inspectTracks
      ? await getFileFormat.fromPath(filepath)
      : getFileFormat(bytes)

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
