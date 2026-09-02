const { inspectSvgAt, isLikelySvg } = require('./inspect')

async function detectAt(buffer, reader, size, opts = {}) {
  if (!opts.inspect) return { format: detect(buffer) }

  return {
    format: (await inspectSvgAt(buffer, reader, size)) ? 'svg' : 'xml'
  }
}

function detect(buffer) {
  if (isLikelySvg(buffer)) return 'svg'

  return 'xml'
}

module.exports = {
  detect,
  detectAt
}
