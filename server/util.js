var fs = require('fs');

module.exports = {
  readSchematicJSON: function (filename, isSecure = true) {
    return new Promise((resolve, reject) => {
      fs.readFile(`${filename}.json`, (err, data) => {
        if (err) reject(err);
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
      return json;
    })
  }
}