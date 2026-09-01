const { inspectSvgAt, isLikelySvg } = require('./inspect')

async function detectAt(format, buffer, reader, size, opts = {}) {
  const result = { format: detect(format, buffer) }

  if (!opts.inspect || result.format === 'svg') return result

  if (await inspectSvgAt(buffer, reader, size)) {
    result.format = 'svg'
  }

  return result
}

function detect(format, buffer) {
  if (format === 'svg') return 'svg'
  if (isLikelySvg(buffer)) return 'svg'

  return 'xml'
}

module.exports = {
  detect,
  detectAt
}
