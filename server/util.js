var fs = require('fs');
var path = require('path');
var config = require('config');


module.exports = {
  getSchemFilePath(sch_name) {
    return `${config.get('App.uploader.dirs.schematics')}/${sch_name}.schematic`;
  },
  getInfoFilePath(sch_name) {
    return `${config.get('App.uploader.dirs.infoFiles')}/${sch_name}.json`;
  },
  readSchematicJSON(sch_name, isSecure = true) {
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
      json['filename'] = sch_name;
      return json;
    })
  }
}
