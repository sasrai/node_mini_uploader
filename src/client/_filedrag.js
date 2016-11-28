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
      props['delete_key'] = getHashedDeleteKey(delkey);
    }

    $('button', item).attr('disabled', 'disabled');

    schematicsAPI.uploadFile(uploadFilesCache[id], props, (error, responce) => {
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
