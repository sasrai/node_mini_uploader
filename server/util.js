var fs = require('fs');
var path = require('path');
var config = require('config');


module.exports = {
  getSchemFilePath: function (filename) {
    return `${config.get('App.uploader.dirs.schematics')}/${filename}.schematic`;
  },
  getInfoFilePath: function (filename) {
    return `${config.get('App.uploader.dirs.infoFiles')}/${filename}.json`;
  },
  readSchematicJSON: function (filename, isSecure = true) {
    return new Promise((resolve) => {
      fs.readFile(`${filename}.json`, (err, data) => {
        if (err) resolve({title: 'undefined', description: 'info load error.', upload_date: '', error: err});
        else resolve(JSON.parse(data));
      });
    })
    .then((json) => {
      if (isSecure) {
        const removeKeys = [
          'delete_key'
        ];
        for (let i = 0; i < removeKeys.length; i++) {
          if (json[removeKeys[i]]) delete json[removeKeys[i]];
        }
      }
      json['filename'] = path.basename(filename, '.schematic');
      return json;
    })
  }
}