# get-file-format

Detect the format of a file by looking at its magic number

> [!IMPORTANT]
> WIP: Check the tests for the current supported file types

## Install

```
npm i get-file-format
```

## Usage

```js
const getFileFormat = require('get-file-format')

const buffer = require('./sample.png', { with: { type: 'binary' } })

const format = getFileFormat(buffer)
// png
```

From a path:

```js
const format = await getFileFormat.fromPath('./sample.mp4')
// mp4
```

Inspect beyond the header to return a more specific format:

```js
const format = await getFileFormat.fromPath('./sample.mp4', {
  inspect: true
})
// mp4 or m4a
```

> Inspection currently supports: MP4 → M4A, MKV → MKA.

It can be used in combination with [get-mime-type](https://github.com/holepunchto/get-mime-type):

```js
const getFileFormat = require('get-file-format')
const getMimeType = require('get-mime-type')

const buffer = require('./sample.png', { with: { type: 'binary' } })

const mimetype = getMimeType(getFileFormat(buffer))
// image/png
```

### CLI

Also available via command line:

```sh
npm i get-file-format -g

gff ./sample.jpg
```

Options:

```sh
  <path>                      Path to the file to inspect
  --verbose, -v               Print bytes and other info
  --inspect, -i               Inspect beyond the header for a more specific format
  --start, -s <byteStart>     Start index of bytes to print in verbose mode
  --length, -n <byteLength>   Number of bytes to print in verbose mode
  --help                      Print help
```

## License

Apache-2.0
