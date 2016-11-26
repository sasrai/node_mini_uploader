'use strict'

// server.js
var express = require('express');
var morgan = require('morgan');
var multer = require('multer');
var cors = require('cors');
var fs = require('fs');
var path = require('path');
var md5File = require('md5-file');

var config = require('config');

var Util = require('./util.js');

var app = express();

// config
const schDirectory = config.get('App.uploader.dirs.schematics');
const isDebug = config.get('Server.Debug');
if (isDebug) console.log("Server is Debug(Develop) Mode.");

// ミドルウェア
morgan.token('remote-addr', function (req, res) {
  var ffHeaderValue = req.headers['x-forwarded-for'];
  return ffHeaderValue || req.connection.remoteAddress;
});
app.use(morgan('[:date[clf]] :remote-addr :remote-user ":method :url HTTP/:http-version" :status - :response-time ms'));
const uploader = multer({ dest: 'schematics' });

const corsOptions = {
  optionsSuccessStatus: 200,
  origin: ''
}
if (isDebug) corsOptions.origin = config.get('Server.AccessOriginURL');
app.use(cors(corsOptions));


// rootはアクセスできましぇん
app.get('/', (req, res) => {
  res.status(404).end();
});

// GETリクエストのハンドリング
app.get('/+schematics', (req, res) => {
  fs.readdir(schDirectory, (err, files) => {
    if (err) res.json({status: "error", message: err.Error});
    else {
      const filenames = files.filter(fn => fn.endsWith('.schematic'));

      const asyncReadInfos = [];
      for (var i = 0; i < filenames.length; i++) {
        asyncReadInfos.push( Util.readSchematicJSON(filenames[i].replace(/.schematic$/, '')) );
      }

      Promise.all(asyncReadInfos)
      .then((results) => res.json(results));
    }
  });
});

app.get('/+schematics/:sch_name', (req, res) => {
  const target = Util.getSchemFilePath(req.params.sch_name);
  if (fs.existsSync(target)) {
    Promise.resolve(Util.readSchematicJSON(target))
    .then((data) => res.json(data))
    .catch((err) => res.status(403).json({ status: 'read error', error: err }));
  } else res.status(404).end();
});

app.get('/+schematics/:sch_name/download', (req, res) => {
  const target = Util.getSchemFilePath(req.params.sch_name);
  if (fs.existsSync(target)) res.download(target);
  else res.status(404).end();
});

// POSTリクエストのハンドリング
app.post('/+schematics/upload', uploader.single('sch_file'), function (req, res, next) {
  if (req.file && req.body.title) {
    const sch_name = path.basename(req.file.originalname, '.schematic');
    const upload_name = Util.getSchemFilePath(sch_name);

    // TODO: md5で上書きチェックを追加
    // TODO: 削除キーで上書きロックを追加
    Promise.resolve(new Promise((resolve, reject) => {
      fs.rename(req.file.path, upload_name, (err) => {
        if (err) reject(err);
        else resolve();
      });
    }))
    .then(() => new Promise((resolve) => {
      // infoディレクトリが無かったら作成
      const dir = config.get('App.uploader.dirs.infoFiles');
      if (fs.existsSync(dir)) fs.mkdir(dir, (err) => resolve());
    }))
    .then(() => Util.encodeDeleteKey(req.body.delete_key))
    .then((encoded_delete_key) => new Promise((resolve, reject) => {
      // その他情報をメモする
      const fileInfo = {
        title: req.body.title,
        original_name: req.file.originalname,
        description: req.body.description,
        delete_key: encoded_delete_key,
        upload_date: Date.now()
      };

      fs.writeFile(Util.getInfoFilePath(sch_name), JSON.stringify(fileInfo),
        (err) => {
          if (err) reject(err);
          else resolve({ status: 'success', info: fileInfo });
        });
    }))
    .then((result) => res.json(result))
    .catch((err) => res.status(500).json({
      status: 'error', message: err.error
    }));

  } else {
    res.status(400).json({ status: "error", message: "Invalid API Syntax"});
  }
});

// 削除キーが一致、もしくは未設定の場合に削除実行
app.delete('/+schematics/:sch_name', uploader.single('delete_key'), (req, res) => {
  console.log("delete => " + req.params.sch_name);

  Promise.resolve(Util.canDeleteFileOfSchematic(req.params.sch_name, req.body.delete_key))
  .then((canDelete) => {
    // 削除キーチェックに引っかかった場合はrejectしてcatchへ飛ばす
    if (!canDelete) return Promise.reject({ Error: "Delete key does not match", Status: 403 });
  })
  .then(() => Util.readSchematicJSON(req.params.sch_name))
  .then((fileInfo) => new Promise((resolve, reject) => {
    // 削除処理1
    fs.unlink(Util.getSchemFilePath(req.params.sch_name), (err) => {
      if (err) reject(err);
      else resolve(fileInfo);
    });
  }))
  .then((fileInfo) => new Promise((resolve, reject) => {
    // 削除処理2
    fs.unlink(Util.getInfoFilePath(req.params.sch_name), (err) => {
      if (err) reject(err);
      else resolve(fileInfo);
    });
  }))
  .then((fileInfo) => {
    // 削除完了レスポンス
    res.json({ status: 'success', file: fileInfo });
  })
  .catch((err) => {
    // エラー返答
    let stcode = 400;
    if (err.Status) stcode = err.Status;
    res.status(stcode).json({ status: "error", message: err.Error });
  })
});

app.listen(config.get('Server.Port'), () => {
  console.log("server has started.");
});

