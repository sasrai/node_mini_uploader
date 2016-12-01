var fs = require('fs');
var path = require('path');
var config = require('config');

var bcrypt = require('bcrypt');


module.exports = {
  getSchemFilePath(sch_name) {
    return `${config.get('App.uploader.dirs.schematics')}/${sch_name}.schematic`;
  },
  getInfoFilePath(sch_name) {
    return `${config.get('App.uploader.dirs.infoFiles')}/${sch_name}.json`;
  },

  encodeDeleteKey(key) {
    return new Promise((resolve, reject) => {
      if (!key) return resolve();
      bcrypt.hash(key, parseInt(config.get('App.uploader.deleteKeyRound')), (err, hash) => {
        if (err) reject(err);
        else resolve(hash);
      });
    });
  },

  readSchematicJSON(sch_name, isSecure = true) {
    return new Promise((resolve) => {
      fs.readFile(this.getInfoFilePath(sch_name), (err, data) => {
        if (err) resolve({title: '', description: 'missing info.', upload_date: '', missingInfoFile: true});
        else resolve(JSON.parse(data));
      });
    })
    .then((json) => {
      // 削除キーが設定されてるかどうかのフラグを設定
      json["enabled_delete_key"] = (json.delete_key && json.delete_key != '');

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
  },

  canDeleteFileOfSchematic(sch_name, delete_key) {
    return new Promise((resolve, reject) => {
      const infoPath = this.getInfoFilePath(sch_name);
      if (!fs.existsSync(infoPath)) resolve(false);

      fs.readFile(infoPath, (err, data) => {
        if (err) reject(err);
        else {
          const json = JSON.parse(data);
          resolve(json.delete_key);
        }
      });
    })
    .then((hashed_delete_key) => new Promise((resolve, reject) => {
      if (hashed_delete_key) {
        bcrypt.compare(delete_key, hashed_delete_key, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      }
      // ファイル側の削除キー未設定かつ削除キーを入力した場合は削除させない
      else if (!hashed_delete_key && delete_key) resolve(false);
      else resolve(true);
    }))
  }
}
