const os = require('bare-os')
const path = require('bare-path')

function tmpPath(extension) {
  return path.join(
    os.tmpdir(),
    `get-file-format-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.${extension}`
  )
}

module.exports = {
  tmpPath
}
