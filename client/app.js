const uploaderApiURL = './api';
var lastUpdateTime = -1;
var uploadFilesCache = [];
var schUploadItemTemplate = null;

function reloadSchematics() {
  axios.get(`${uploaderApiURL}/schematics?${Date.now()}`)
  .then((response) => {
    schFilesHelper.updateData(response.data);
  })
  .catch((error) => {
    console.log(error);
  });
}

function uploadSchematicFile(file, props, cb) {
  var data = new FormData();
  for (var k in props) {
    data.append(k, props[k]);
  }
  data.append('sch_file', file);

  axios.post(`${uploaderApiURL}/schematics/upload`, data)
  .then((response) => {
    setTimeout(() => $('#sch-files').bootstrapTable('refresh'));
    if (cb && typeof cb == 'function') cb(null, response);
  })
  .catch((error) => {
    console.log(error);
    if (cb && typeof cb == 'function') cb(error, null);
  })
}

function loadSUITemplate() {
  axios('./sch-upload-item-template.html')
  .then((response) => {
    schUploadItemTemplate = $(response.data);
  });
}

function renderOutput(files) {
  // テンプレートキャッシュを更新
  loadSUITemplate();
  
  // files is a FileList of File objects. List some properties.
  let output = [];
  for (var i = 0, f; f = files[i]; i++) {
    const itemNode = schUploadItemTemplate.clone();

    itemNode.data('id', i);
    $('p.filename strong', itemNode).text(escapeHtml(f.name));

    $('.form-group.title label', itemNode).attr('for', `${i}-title`);
    $('.form-group.title input', itemNode).attr('id', `${i}-title`);

    $('.form-group.description label', itemNode).attr('for', `${i}-description`);
    $('.form-group.description textarea', itemNode).attr('id', `${i}-description`);

    $('.form-group.delete-key label', itemNode).attr('for', `${i}-delete-key`);
    $('.form-group.delete-key input', itemNode).attr('id', `${i}-delete-key`);

    // 同名ファイルが一覧に存在する場合は上書きチェックを表示

    output.push(itemNode);
  }
  $('output#list').html('<ul class="container-fluid"></ul>');
  $('output#list ul').append(output);
  // document.getElementById('list').innerHTML = '' + output.join('') + '</ul>';

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
    if (delkey && delkey != '') { // 16進数化
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
  sortName: 'modified_date',
  sortOrder: 'desc',
  pagination: true,
  search: true,
  onResetView: function(ev) {
    new Clipboard('.sch-command-copy', {
      text: function(trigger) {
        return `//schem load ${$(trigger).data('filename')}`;
      }
    })
  },
  columns: [
    { title: '名前', field: 'title', sortable: true },
    { title: 'ファイル名', field: 'filename', class: 'small', sortable: true },
    { title: '更新日時', field: 'modified_date', class: 'small', sortable: true,
      formatter: (param, record, id) => {
        if (!param || param < 1) return ''

        const date = new Date(param);
        return [
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate()
        ].join( '/' ) + ' '
        + date.toLocaleTimeString();
      }
    },
    { title: '詳細', field: 'description', class: 'small' },
    { title: '操作', field: 'dropdown',
      formatter: (param, record, id) => {
        const downloadUrl = uploaderApiURL + '/schematics/' + record.filename + '/download';

        // TODO: 結合重いはずだからテンプレート化する
        const dropdowns = $('<div></div>');
        dropdowns.append('<div class="btn-group btn-group-sm"></div>');
        $('.btn-group', dropdowns).append(`<button type="button" class="btn btn-secondary btn-no-outline sch-command-copy" data-filename="${record.filename}"><small>コマンドをコピー</small><i class="fa fa-clipboard" aria-hidden="true"></i></button>`);
        $('.btn-group', dropdowns).append('<button type="button" class="btn btn-secondary dropdown-toggle dropdown-toggle-split" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><span class="sr-only">Toggle Dropdown</span></button>');
        $('.btn-group', dropdowns).append('<div class="dropdown-menu"></div>');
        $('.dropdown-menu', dropdowns).append('<h6 class="dropdown-header">その他操作</h6>');
        $('.dropdown-menu', dropdowns).append(`<a class="dropdown-item" href="${downloadUrl}">ダウンロード <i class="fa fa-download" aria-hidden="true" /></a>`);
        $('.dropdown-menu', dropdowns).append(`<a class="dropdown-item" href="#">削除(未実装) <i class="fa fa-trash" aria-hidden="true" /></a>`);

        return dropdowns.html();
      }
    },
  ],
  onRefresh: () => { reloadSchematics(); lastUpdateTime = Date.now(); startUTDisplay(); }
});
$('#sch-files').bootstrapTable('refresh');
$('#sch-toolbar > button.refresh').on('click', () => {
  $('#sch-toolbar > button.refresh').attr('disabled', 'disabled');
  $('#sch-files').bootstrapTable('refresh');
  setTimeout(() => $('#sch-toolbar > button.refresh').removeAttr('disabled'), 1000);
});
loadSUITemplate();

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
      sf.bootstrapTable('append', Object.assign({
        title:'', filename: '', upload_date: 0, description: '', dropdown: ''
      }, d));
    });
  }
}

function escapeHtml(content) {
  var TABLE_FOR_ESCAPE_HTML = {
    "&": "&amp;",
    "\"": "&quot;",
    "<": "&lt;",
    ">": "&gt;"
  };
  return content.replace(/[&"<>]/g, function(match) {
    return TABLE_FOR_ESCAPE_HTML[match];
  });
}