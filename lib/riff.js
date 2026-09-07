const { lookup } = require('./util')

const signature = {
  avi: [{ sequence: [0x41, 0x56, 0x49, 0x20], offset: 8 }],
  webp: [{ sequence: [0x57, 0x45, 0x42, 0x50], offset: 8 }],
  wav: [{ sequence: [0x57, 0x41, 0x56, 0x45], offset: 8 }]
}

function detect(buffer) {
  return lookup(signature, buffer)
}

module.exports = {
  detect
}
