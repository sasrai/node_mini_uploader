const uploaderApiURL = 'http://mcmap.sasrai.jp/%E9%85%94%E3%81%84%E3%81%A9%E3%82%8C/uploader/api';
var lastUpdateTime = -1;
var uploadFilesCache = [];

function reloadSchematics() {
  axios.get(uploaderApiURL + '/schematics?' + Date.now())
  .then((response) => {
    schFilesHelper.updateData(response.data);
  })
  .catch((error) => {
    console.log(error);
  });
}

function uploadSchematicFile(file, props, cb) {
  var data = new FormData();
  data.append('title', props['title']);
  data.append('description', props['description']);
  data.append('delete_key', props['delete_key']);
  data.append('sch_file', file);

  axios.post(uploaderApiURL + '/schematics/upload', data)
  .then((response) => {
    setTimeout(() => $('#sch-files').bootstrapTable('refresh'));
    if (cb && typeof cb == 'function') cb(null, response);
  })
  .catch((error) => {
    console.log(error);
    if (cb && typeof cb == 'function') cb(error, null);
  })
}

function renderOutput(files) {
  // files is a FileList of File objects. List some properties.
  var output = [];
  for (var i = 0, f; f = files[i]; i++) {
    output.push('<div class="sch-upload-items col-xs-12 col-sm-6 col-md-4" data-id=' + i + '><div class="border-box">',
                '<p class="filename"><strong>' + escape(f.name) + '</strong></p>',
                '<div class="container-fluid">',
                  '<div class="form-group">',
                    '<label for="' + i + '-title">タイトル</label>',
                    '<input class="form-control" name="title" id="' + i + '-title" placeholder="表示タイトルを入力してください(必須)">',
                  '</div>',
                  '<div class="form-group">',
                    '<label for="' + i + '-description">詳細</label>',
                    '<textarea class="form-control" name="description" id="' + i + '-description" rows="2" placeholder="ファイルの説明分を入力してください(任意)"></textarea>',
                  '</div>',
                  '<div class="form-group">',
                    '<label for="' + i + '-delete_key">削除キー(処理未実装)</label>',
                    '<input class="form-control" name="delete_key" id="' + i + '-delete_key" placeholder="削除キー(任意)">',
                  '</div>',
                  '<div class="btn-group btn-block" role="group" aria-label="Schematics control">',
                    '<button type="button" class="btn btn-info upload">アップロード <i class="fa fa-upload" aria-hidden="true"></i></button>',
                    '<button type="button" class="btn btn-secondary cancel">キャンセル</button>',
                  '</div>',
                '</div>',
                // f.size, ' bytes, last modified: ',
                // f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
                '</div></div>');
  }
  document.getElementById('list').innerHTML = '<ul class="container-fluid">' + output.join('') + '</ul>';

  // 全部のキー操作イベントでバリデーションチェックかける
  $('.sch-upload-items input[name=title]').on('blur keypress keyup', function() {
    if ($(this).val().length > 0) {
      $(this).parents('.form-group').removeClass('has-danger');
      $(this).removeClass('form-control-danger');
      $(this).parents('.sch-upload-items').find('button.upload').removeAttr('disabled');
    } else {
      $(this).parents('.form-group').addClass('has-danger');
      $(this).addClass('form-control-danger');
      $(this).parents('.sch-upload-items').find('button.upload').attr('disabled', 'disabled');
    }
  }).trigger('blur');

  $('.sch-upload-items button.upload').on('click', function (evt) {
    var item = $(this).parents('.sch-upload-items');
    var id = item.data('id');
    var props = {
      title: $('input[name=title]', item).val(),
      description: $('textarea[name=description]', item).val(),
    }

    var delkey = $('input[name=delete_key]', item).val()
    if (delkey) { // 16進数化
      var shainfo = CryptoJS.SHA256(delkey);
      var hashstr = '';
      for (var i = 0; i < shainfo.words.length; i++) {
        hashstr += (shainfo.words[i] >>> 0).toString(16);
      }
      props['delete_key'] = hashstr;
    }

    $('button', item).attr('disabled', 'disabled');

    uploadSchematicFile(uploadFilesCache[id], props, (error, responce) => {
      if (error) {
        $('button', item).removeAttr('disabled');
       console.log('id' + id + 'がアップロードエラー起こしてます');
      } else {
        document.getElementById('list').innerHTML = '';
        uploadFilesCache.splice(id, 1);
        renderOutput(uploadFilesCache);
      }
    });
  })

  $('.sch-upload-items button.cancel').on('click', function (evt) {
    var id = $(this).parents('.sch-upload-items').data('id');

    document.getElementById('list').innerHTML = '';
    uploadFilesCache.splice(id, 1);
    renderOutput(uploadFilesCache);
  })
}

function handleFileSelect(evt) {
  this.className = '';
  evt.stopPropagation();
  evt.preventDefault();

  for (var i = 0, f; f = evt.dataTransfer.files[i]; i++) {
    uploadFilesCache.push(f);
  }

  renderOutput(uploadFilesCache);
}

function handleDragOver(evt) {
  this.className = 'hover';
  evt.stopPropagation();
  evt.preventDefault();
  evt.dataTransfer.dropEffect = 'link'; // Explicitly show this is a copy.
}
function handleDragLeave(evt) {
  this.className = '';
}

// Setup the dnd listeners.
var dropZone = document.getElementById('drop-zone');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('dragleave', handleDragLeave, false);
dropZone.addEventListener('drop', handleFileSelect, false);

// document.getElementById('sch-reload').addEventListener('click', reloadSchematics, false);
$('#sch-files').bootstrapTable({
  toolbar: '#sch-toolbar',
  columns: [
    { title: '名前', field: 'title' },
    { title: 'ファイル名', field: 'filename' },
    { title: 'アップロード日時', field: 'upload_date', formatter: (d) => {console.log(); return ''} },
    { title: '詳細', field: 'description' },
    { title: 'ダウンロード', field: 'download',
      formatter: (param, record, id) => {
        var downloadUrl = uploaderApiURL + '/schematics/' + record.filename + '/download';
        return '<a class="btn btn-primary btn-info btn-sm" href="' + downloadUrl
        + '">ダウンロード <i class="fa fa-download" aria-hidden="true" /></a>'} },
  ],
  onRefresh: () => { reloadSchematics(); lastUpdateTime = Date.now(); startUTDisplay(); }
});
$('#sch-files').bootstrapTable('refresh');
$('#sch-toolbar > button.refresh').on('click', () => {
  $('#sch-toolbar > button.refresh').attr('disabled', 'disabled');
  $('#sch-files').bootstrapTable('refresh');
  setTimeout(() => $('#sch-toolbar > button.refresh').removeAttr('disabled'), 1000);
});

var schUTDisplay = $('#sch-toolbar > span.updated-time')[0];
var schUTUpdateTimer = null;
function startUTDisplay() {
  // 多重起動防止
  if (schUTUpdateTimer != null) return;

  schUTUpdateTimer = setInterval( () => {
    if (lastUpdateTime < 1) schUTDisplay.textContent = '';
    else if ((Date.now() - lastUpdateTime) > 3600000) {
      schUTDisplay.innerHTML = '<span class="text-warning">下記のリストは1時間以上更新されていません。</span>';
      clearInterval(schUTUpdateTimer);
      schUTUpdateTimer = null;
    } else {
      var time = Math.floor((Date.now() - lastUpdateTime) / 1000);
      if (time > 300) time = '<span class="text-warning">' + time + '秒</span>';
      else time += '秒';
      schUTDisplay.innerHTML = '最終更新から ' + time + ' 経過しています。';
    }
  }, 500);
}

window.schFilesHelper = {
  updateData: (data) => {
    const sf = $('#sch-files'); 
    sf.bootstrapTable('removeAll');
    data.forEach((d) => {
      sf.bootstrapTable('append', Object.assign({title:'', filename: '', upload_date: 0, description: '', download: ''}, d));
    });
  }
}
