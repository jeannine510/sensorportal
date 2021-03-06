[![Build Status](https://secure.travis-ci.org/janantala/qrcode.js.png?branch=master)](http://travis-ci.org/janantala/qrcode.js) [![Coverage Status](https://coveralls.io/repos/janantala/qrcode.js/badge.png?branch=master)](https://coveralls.io/r/janantala/qrcode.js?branch=master)

# qrcode.js v1.0.1

QR code generator, supports Numeric, Alphanumeric and Binary inputMode up to lvl 40.

# Installation

## Bower

We use [bower](http://twitter.github.com/bower/) for dependency management. Add

    dependencies: {
        "qrcode": "latest"
    }

To your `bower.json` file. Then run

    bower install

# Usage

#### Create QR code
```
var qr = new QRCode(typeNumber, correction, inputMode);
qr.addData(text);
qr.make();
```

#### Get module count
```
var modules = qr.getModuleCount();
```

#### Get tile color
```
for (var row = 0; row < modules; row++) {
  for (var col = 0; col < modules; col++) {
    var color = qr.isDark(row, col) ? '#000' : '#fff';
    ...
  }
}
```

## type number
- supported are all levels **1-40**
- use **0** for the lowest complexity

## correction 
- Integer **1** - Level L (Low)
- Integer **0** - Level M (Medium)
- Integer **3** - Level Q (Quartile)
- Integer **2** - Level H (High)

## input mode 
- `NUMBER`
- `ALPHA_NUM`
- `8bit` (default)

# Reference
Kazuhiko Arase, http://www.d-project.com/

# License

The MIT License

Copyright (c) 2013 Jan Antala, http://janantala.com
