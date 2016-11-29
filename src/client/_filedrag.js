let __UploadSchematicItem_Template = null; // スタティックプロパティ代わり
class UploadSchematicItem {
  static get Template() {
    return __UploadSchematicItem_Template;
  }
  static set Template(template) {
    __UploadSchematicItem_Template = template;
  }
  static loadSUITemplate() {
    axios(`./sch-upload-item-template.html?${Date.now()}`)
    .then((response) => {
      UploadSchematicItem.Template = $($(response.data).get(0));
    });
  }

  constructor(id, file, duplicate = false) {
    if (!UploadSchematicItem.Template)
      throw new Error("Unloaded template data.");

    // メンバ変数初期化
    this.newFilename = null;

    this.template = $(UploadSchematicItem.Template.clone());
    if (arguments.length > 0) this.Id = id;
    if (arguments.length > 1) {
      this.filedata = file;
      this.Filename = file.name;
    }
    if (arguments.length > 2) this.isDuplicateFile = false;

    // 各イベントの設定
    $('input[name=title]', this.template).on('blur keypress keyup', (evt) => this.handleTitleValidate(evt));
    $('button.upload', this.template).on('click', (evt) => this.handleUploadButtonClick(evt));
    $('button.cancel', this.template).on('click', (evt) => this.handleCancelButtonClick(evt));
  }

  set Id(id) {
    this.id = id;
  }
  get Id() {
    return this.id;
  }

  set Filename(filename) {
    this.newFilename = filename;
  }
  get Filename() {
    return (this.newFilename) ? this.newFilename : this.filedata.name;
  }

  get Title() {
    return $('input[name=title]', this.template).val();
  }
  get Description() {
    return $('textarea[name=description]', this.template).val();
  }
  get DeleteKey() {
    return $('input[name=delete_key]', this.template).val();
  }

  // 同名ファイルが存在してる場合にtrueに設定
  set isDuplicateFile(flag) {
  }

  getJQueryObject() {
    // 各種レンダリング
    this.template.data('id', this.Id);
    $('p.filename strong', this.template).text(escapeHtml(this.Filename));

    // 各フォームのIDを設定
    $('.form-group.title label', this.template).attr('for', `${this.Id}-title`);
    $('.form-group.title input', this.template).attr('id', `${this.Id}-title`);

    $('.form-group.description label', this.template).attr('for', `${this.Id}-description`);
    $('.form-group.description textarea', this.template).attr('id', `${this.Id}-description`);

    $('.form-group.delete-key label', this.template).attr('for', `${this.Id}-delete-key`);
    $('.form-group.delete-key input', this.template).attr('id', `${this.Id}-delete-key`);

    $('input[name=title]', this.template).trigger('blur');

    return this.template;
  }

  handleTitleValidate(evt) {
    if (this.Title.length > 0) {
      $('.form-group.title', this.template).removeClass('has-danger');
      $('input[name=title]', this.template).removeClass('form-control-danger');
      $('button.upload',     this.template).removeAttr('disabled');
    } else {
      $('.form-group.title', this.template).addClass('has-danger');
      $('input[name=title]', this.template).addClass('form-control-danger');
      $('button.upload',     this.template).attr('disabled', 'disabled');
    }
  }
  handleCancelButtonClick(evt) {
    setTimeout(() => this.template.trigger("schup:uploaded", { id: this.id }), 50);
  }
  handleUploadButtonClick(evt) {
    $('button', this.template).attr('disabled', 'disabled');

    let props = {
      title: this.Title,
      description: this.Description,
    }

    const delkey = this.DeleteKey
    if (delkey && delkey != '') { // 何か文字が含まれてたら16進数化してプロパティ追加
      props['delete_key'] = getHashedDeleteKey(delkey);
    }

    // TODO: filename差し替え処理を追加
    schematicsAPI.uploadFile(this.filedata, props, (error, responce) => {
      if (error) {
        $('button', this.template).removeAttr('disabled');
        this.template.trigger("schup:uploaderror", { id: this.id, Error: error });
      } else {
        this.template.trigger("schup:uploaded", { id: this.id, title: this.Title, filename: this.Filename });
      }
    });

  }

  setEventCancel(handler) {
    this.template.on("schup:canceled", handler);
  }
  setEventUploaded(handler) {
    this.template.on("schup:uploaded", handler);
  }
  setEventUploadError(handler) {
    this.template.on("schup:uploaderror", handler);
  }
}
// テンプレートの初期読み込み
UploadSchematicItem.loadSUITemplate();



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

      output.push(itemNode.getJQueryObject());
    }
    $('output#list').html('<ul class="container-fluid"></ul>');
    $('output#list ul').append(output);
  }
}

const dadUploader = new DragAndDropUploader();
dadUploader.initializer();
