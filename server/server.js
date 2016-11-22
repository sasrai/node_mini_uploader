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
const upload = multer({ dest: 'schematics' });

const corsOptions = {
  optionsSuccessStatus: 200
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
app.post('/+schematics/upload', upload.single('sch_file'), function (req, res, next) {
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
    .then(() => new Promise((resolve, reject) => {
      // その他情報をメモする
      const fileInfo = {
        title: req.body.title,
        original_name: req.file.originalname,
        description: req.body.description,
        delete_key: req.body.delete_key,
        upload_date: Date.now()
      };

      fs.writeFile(Util.getSchemFilePath(sch_name), JSON.stringify(fileInfo),
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

// TODO: deleteメソッドの実装
// 削除キーが一致、もしくは未設定の場合に削除実行
app.delete('/+schematics/:sch_name', (req, res) => {
  console.log("delete => " + req.params.sch_name);
  res.status(400).json({ status: "error", message: "Invalid API Syntax"});
});

app.listen(config.get('Server.Port'), () => {
  console.log("server has started.");
});

