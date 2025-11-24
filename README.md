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
  --start, -s <byteStart>     Start index of bytes to print in verbose mode
  --length, -n <byteLength>   Number of bytes to print in verbose mode
  --help                      Print help
```
