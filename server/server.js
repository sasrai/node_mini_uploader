'use strict'

// server.js
var express = require('express');
var morgan = require('morgan');
var multer = require('multer');
var fs = require('fs');
var md5File = require('md5-file');

var Util = require('./util.js');

var app = express();

// ミドルウェア
morgan.token('remote-addr', function (req, res) {
    var ffHeaderValue = req.headers['x-forwarded-for'];
    return ffHeaderValue || req.connection.remoteAddress;
});
app.use(morgan('[:date[clf]] :remote-addr :remote-user ":method :url HTTP/:http-version" :status - :response-time ms'));
const upload = multer({ dest: 'schematics' });

// config
const schDirectory = './schematics';
const isDebug = true;
const accessOrigin = 'http://localhost:8001';

// rootはアクセスできましぇん
app.get('/', (req, res) => {
  res.statusCode = 404;
  res.end();
});

// GETリクエストのハンドリング
app.get('/+schematics', (req, res) => {
  fs.readdir(schDirectory, (err, files) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (isDebug) res.setHeader('Access-Control-Allow-Origin', accessOrigin);
    if (err) { res.end('{status: error}'); }
    else {
      const filenames = files.filter(fn => fn.endsWith('.schematic'));
      const _files = filenames.map(fn => { return {filename: fn.replace(/\.schematic$/, '') } });

      const asyncReadInfos = [];
      for (var i = 0; i < filenames.length; i++) {
        asyncReadInfos.push( Util.readSchematicJSON(`${schDirectory}/${filenames[i]}`) );
      }

      Promise.all(asyncReadInfos)
      .then((results) => {
        res.end(JSON.stringify(results));
      });
    }
  });
});

app.get('/+schematics/:sch_name', (req, res) => {
  const target = `${schDirectory}/${req.params.sch_name}.schematic`;
  if (fs.existsSync(target)) {
    Promise.resolve(Util.readSchematicJSON(target))
    .then((data) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (isDebug) res.setHeader('Access-Control-Allow-Origin', accessOrigin);
      res.end(JSON.stringify(data));
    }).catch((err) => {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (isDebug) res.setHeader('Access-Control-Allow-Origin', accessOrigin);
      res.end(JSON.stringify({ status: 'read error', error: err }));
    });
  } else {
    console.log("404 - " + req.params.sch_name);
    res.statusCode = 404;
    res.end();
  }
});

app.get('/+schematics/:sch_name/download', (req, res) => {
  const target = `${schDirectory}/${req.params.sch_name}.schematic`;
  if (fs.existsSync(target)) {
    res.download(target);
  } else {
    res.statusCode = 404;
    res.end();
  }
});

// POSTリクエストのハンドリング
app.post('/+schematics/upload', upload.single('sch_file'), function (req, res, next) {
  if (req.file && req.body.title) {
    const upload_name = `schematics/${req.file.originalname}`;

    // TODO: md5で上書きチェックを追加
    // TODO: 削除キーで上書きロックを追加
    Promise.resolve(new Promise((resolve, reject) => {
      fs.rename(req.file.path, upload_name, (err) => {
        if (err) reject(err);
        else resolve();
      });
    })).then(() => new Promise((resolve, reject) => {
      // その他情報をメモする
      fs.writeFile(`${upload_name}.json`, JSON.stringify( {
        title: req.body.title,
        description: req.body.description,
        delete_key: req.body.delete_key,
        upload_date: Date.now() } ),
        (err) => {
          if (err) reject(err);
          else {
            resolve({ status: 'success', file: upload_name });
          }
        });
    })).then((result) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (isDebug) res.setHeader('Access-Control-Allow-Origin', accessOrigin);
      res.end(JSON.stringify(result));
    }).catch((err) => {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (isDebug) res.setHeader('Access-Control-Allow-Origin', accessOrigin);
      res.end(JSON.stringify({ status: 'error', message: err.message, error: err }));
    });

  } else {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    if (isDebug) res.setHeader('Access-Control-Allow-Origin', accessOrigin);
    res.end('{status:error,message:"Invalid API Syntax"}');
  }
});

// TODO: deleteメソッドの実装
// 削除キーが一致、もしくは未設定の場合に削除実行
app.get('/+schematics/:sch_name/download', (req, res) => {
});

app.listen(8334, () => {
  console.log("server has started.");
});

