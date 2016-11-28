class DragAndDropUploader {
  constructor() {
    this.schUploadItemTemplate = null;
    this.uploadFilesCache = [];
  }

  loadSUITemplate() {
    axios(`./sch-upload-item-template.html?${Date.now()}`)
    .then((response) => {
      this.schUploadItemTemplate = $(response.data);
    });
  }

  handleFileSelect(evt) {
    evt.target.className = '';
    evt.stopPropagation();
    evt.preventDefault();

    for (var i = 0, f; f = evt.dataTransfer.files[i]; i++) {
      this.uploadFilesCache.push(f);
    }

    this.renderOutput();
  }

  handleDragOver(evt) {
    evt.target.className = 'hover';
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'link'; // Explicitly show this is a copy.
  }

  handleDragLeave(evt) {
    this.className = '';
  }

  handleTitleValidate(evt) {
    const target = $(evt.target);
    if (target.val().length > 0) {
      target.parents('.form-group').removeClass('has-danger');
      target.removeClass('form-control-danger');
      target.parents('.sch-upload-items').find('button.upload').removeAttr('disabled');
    } else {
      target.parents('.form-group').addClass('has-danger');
      target.addClass('form-control-danger');
      target.parents('.sch-upload-items').find('button.upload').attr('disabled', 'disabled');
    }
  }

  handleUploadButtonClick(evt) {
    var item = $(evt.target).parents('.sch-upload-items');
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

    schematicsAPI.uploadFile(this.uploadFilesCache[id], props, (error, responce) => {
      if (error) {
        $('button', item).removeAttr('disabled');
      console.log('id' + id + 'がアップロードエラー起こしてます');
      } else {
        document.getElementById('list').innerHTML = '';
        this.uploadFilesCache.splice(id, 1);
        this.renderOutput();
      }
    });
  }

  handleCancelButtonClick(evt) {
    var id = $(evt.target).parents('.sch-upload-items').data('id');

    document.getElementById('list').innerHTML = '';
    this.uploadFilesCache.splice(id, 1);
    this.renderOutput();
  }

  initializer() {
    // Setup the dnd listeners.
    var dropZone = document.getElementById('drop-zone');
    dropZone.addEventListener('dragover', (evt) => this.handleDragOver(evt), false);
    dropZone.addEventListener('dragleave', (evt) => this.handleDragLeave(evt), false);
    dropZone.addEventListener('drop', (evt) => this.handleFileSelect(evt), false);

    this.loadSUITemplate();
  }

  renderOutput() {
    // files is a FileList of File objects. List some properties.
    let output = [];
    for (var i = 0, f; f = this.uploadFilesCache[i]; i++) {
      const itemNode = this.schUploadItemTemplate.clone();

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
    $('.sch-upload-items input[name=title]').on('blur keypress keyup', (evt) => this.handleTitleValidate(evt)).trigger('blur');
    $('.sch-upload-items button.upload').on('click', (evt) => this.handleUploadButtonClick(evt));
    $('.sch-upload-items button.cancel').on('click', (evt) => this.handleCancelButtonClick(evt));
  }
}

const dadUploader = new DragAndDropUploader();
dadUploader.initializer();
