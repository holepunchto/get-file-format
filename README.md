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

Can be used in combination with [get-mime-type](https://github.com/holepunchto/get-mime-type):

```js
const getFileFormat = require('get-file-format')
const getMimeType = require('get-mime-type')

const buffer = require('./sample.png', { with: { type: 'binary' } })

const mimetype = getMimeType(getFileFormat(buffer))
// image/png
```
