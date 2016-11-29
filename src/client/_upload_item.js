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

    // テンプレートのクローンを作成
    this.template = $(UploadSchematicItem.Template.clone());

    // メンバ変数初期化
    this.newFilename = null;
    this.DuplicateFile = null;
    this.uploading = false; // TODO: 状態遷移を実装

    if (arguments.length > 0) this.Id = id;
    if (arguments.length > 1) {
      this.filedata = file;
      this.Filename = file.name;
    }
    if (arguments.length > 2) this.isDuplicateFile = false;

    // 各イベントの設定
    this.setLocalEventHandler();
  }

  get canUploadable() {
    let uploadable = true;

    if (!this.isValidatedTitle) uploadable = false;

    if (this.isDuplicated && !this.isOverwrite) uploadable = false;

    if (this.isUploading) uploadable = false;

    return uploadable;
  }
  get canUploadCancel() {
    let canCancel = true;

    if (this.isUploading) canCancel = false;

    return canCancel;
  }
  get isValidatedTitle() {
    return this.Title.length > 0;
  }
  get isDuplicated() {
    return !!this.duplicateFile;
  }
  get isOverwrite() {
    return !!$('input[name=overwrite]:checked', this.template).val();
  }
  get isUploading() {
    return this.uploading; // TODO: 状態遷移を実装
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
  set DuplicateFile(file) {
    this.duplicateFile = file;

    if (this.isDuplicated) {
      $('label.overwrite', this.template).show();
    } else {
      $('label.overwrite', this.template).hide();
    }
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

    // タイトルのバリデーションチェックを実行
    $('input[name=title]', this.template).trigger('blur');

    // ボタンの状態を更新
    this.updateButtonStatus();

    return this.template;
  }

  updateButtonStatus() {
    if (this.canUploadable) $('button.upload', this.template).removeAttr('disabled');
    else $('button.upload', this.template).attr('disabled', 'disabled');

    if (this.canUploadCancel) $('button.cancel', this.template).removeAttr('disabled');
    else $('button.cancel', this.template).attr('disabled', 'disabled');
  }

  setLocalEventHandler() {
    $('input[name=title]',     this.template).on('blur keypress keyup', (evt) => this.handleTitleValidate(evt));
    $('button.upload',         this.template).on('click',  (evt) => this.handleUploadButtonClick(evt));
    $('button.cancel',         this.template).on('click',  (evt) => this.handleCancelButtonClick(evt));
    $('input[name=overwrite]', this.template).on('change', (evt) => this.handleOverwriteCheckChanged(evt));
  }

  handleTitleValidate(evt) {
    if (this.isValidatedTitle) {
      $('.form-group.title', this.template).removeClass('has-danger');
      $('input[name=title]', this.template).removeClass('form-control-danger');
    } else {
      $('.form-group.title', this.template).addClass('has-danger');
      $('input[name=title]', this.template).addClass('form-control-danger');
    }
    this.updateButtonStatus();
  }
  handleOverwriteCheckChanged(evt) {
    this.updateButtonStatus();
  }
  handleCancelButtonClick(evt) {
    setTimeout(() => this.template.trigger("schup:uploaded", { id: this.id }), 50);
  }
  handleUploadButtonClick(evt) {
    this.uploading = true;
    this.updateButtonStatus();

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
      this.uploading = false;
      if (error) {
        this.updateButtonStatus();
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
