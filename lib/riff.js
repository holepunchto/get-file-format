const signature = {
  avi: [{ sequence: [0x41, 0x56, 0x49, 0x20], offset: 8 }],
  webp: [{ sequence: [0x57, 0x45, 0x42, 0x50], offset: 8 }],
  wav: [{ sequence: [0x57, 0x41, 0x56, 0x45], offset: 8 }]
}

function startsWith(buffer, sequence, offset = 0) {
  for (let i = 0; i < sequence.length; i++) {
    if (buffer[i + offset] !== sequence[i]) return false
  }

  return true
}

function detect(buffer) {
  for (const type in signature) {
    for (const { sequence, offset = 0 } of signature[type]) {
      if (startsWith(buffer, sequence, offset)) return type
    }
  }

  return null
}

module.exports = {
  detect
}
