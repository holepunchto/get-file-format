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

By default, only the file header is inspected. To inspect media files and distinguish audio-only files:

```js
const format = await getFileFormat.fromPath('./sample.mp4', {
  inspectTracks: true
})
// mp4 or m4a
```

It can be used in combination with [get-mime-type](https://github.com/holepunchto/get-mime-type):

```js
const getFileFormat = require('get-file-format')
const getMimeType = require('get-mime-type')

const buffer = require('./sample.png', { with: { type: 'binary' } })

const mimetype = getMimeType(getFileFormat(buffer))
// image/png
```

### API reference

| API                                                  | Description                         |
| ---------------------------------------------------- | ----------------------------------- |
| `getFileFormat(buffer, opts)`                        | Detect from a buffer                |
| `getFileFormat.fromPath(path, opts)`                 | Detect from a file path             |
| `getFileFormat.fromFileDescriptor(fd, opts)`         | Detect from an open file descriptor |
| `getFileFormat.fromRandomAccessReader(reader, opts)` | Detect from a random-access source  |

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
  --inspect-tracks, -i        Inspect tracks in media files to distinguish audio-only files
  --start, -s <byteStart>     Start index of bytes to print in verbose mode
  --length, -n <byteLength>   Number of bytes to print in verbose mode
  --help                      Print help
```

## License

Apache-2.0
