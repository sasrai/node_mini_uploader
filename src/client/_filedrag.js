class DragAndDropUploader {
  constructor() {
    this.schUploadItemTemplate = null;
    this.uploadFilesCache = [];
  }

  handleFileSelect(evt) {
    evt.target.className = '';
    evt.stopPropagation();
    evt.preventDefault();

    for (var i = 0, f; f = evt.originalEvent.dataTransfer.files[i]; i++) {
      this.uploadFilesCache.push(f);
    }

    this.renderOutput();
  }

  handleDragOver(evt) {
    evt.target.className = 'hover';
    evt.stopPropagation();
    evt.preventDefault();
    evt.originalEvent.dataTransfer.dropEffect = 'link'; // Explicitly show this is a copy.
  }

  handleDragLeave(evt) {
    this.className = '';
  }

  initializer() {
    // Setup the dnd listeners.
    var dropZone = $('#drop-zone');
    dropZone.on('dragover', (evt) => this.handleDragOver(evt));
    dropZone.on('dragleave', (evt) => this.handleDragLeave(evt));
    dropZone.on('drop', (evt) => this.handleFileSelect(evt));
  }

  renderOutput() {
    // files is a FileList of File objects. List some properties.
    let output = [];
    const fileList = SchematicsListController.GetFileList();
    for (var i = 0, f; f = this.uploadFilesCache[i]; i++) {
      const itemNode = new UploadSchematicItem(i, f);

      // イベント設定
      itemNode.setEventCancel((evt, data) => {
        this.uploadFilesCache.splice(data.id, 1);
        this.renderOutput();
      });
      itemNode.setEventUploaded((evt, data) => {
        SchematicsListController.ReloadList();
        this.uploadFilesCache.splice(data.id, 1);
        this.renderOutput();
        swal(`${data.title}のアップロードが完了しました`, '', 'success');
      });

      // 同名ファイルが一覧に存在する場合は上書きチェックを表示
      if (fileList.indexOf(f.name) >= 0) itemNode.DuplicateFile = f;

      output.push(itemNode.getJQueryObject());
    }
    $('output#list').html('<ul class="container-fluid"></ul>');
    $('output#list ul').append(output);
  }
}

const dadUploader = new DragAndDropUploader();
dadUploader.initializer();
