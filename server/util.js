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
      fs.readFile(this.getInfoFilePath(sch_name), (err, data) => {
        if (err) resolve({title: '', description: 'missing info.', upload_date: '', missingInfoFile: true});
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
    .then((json) => new Promise((resolve, reject) => {
      fs.stat(this.getSchemFilePath(sch_name), (err, stats) => {
        json['modified_date'] = (new Date(stats.mtime)).getTime();
        resolve(json);
      })
    }))
  }
}
