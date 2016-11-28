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
    $('.sch-file-delete').on('click', function() {
      swal({
        title: "削除確認",
        text: `<strong>${$(this).data('filename')}</strong>を削除してもよろしいですか？<p><small style="font-size:9pt">※ 未記入の場合は削除キー未登録のアイテムのみ削除できます。</small></p>`,
        type: 'input',
        html: true,
        customClass: 'sa-delete-key-input',
        showCancelButton: true,
        cancelButtonText: 'キャンセル',
        confirmButtonColor: '#DD6B55',
        confirmButtonText: '削除するよ!',
        inputPlaceholder: '削除キーを入力してください。'
      }, (inputValue) => {
        if (false != inputValue)
          schematicsAPI.deleteFile($(this).data('filename'), inputValue, (err, response) => {
            setTimeout(() => {
              if (err) swal(`${$(this).data('filename')}の削除に失敗しました`, "挙動おかしい時は鯖管に教えてあげてね", "error");
              else {
                swal(`${response.data.file.filename}を削除しました`, "", "success");
                $('#sch-files').bootstrapTable('refresh');
              }
            }, 500);
          });
      });
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
        // TODO: 結合重いはずだからテンプレート化する
        const dropdowns = $('<div></div>');
        dropdowns.append('<div class="btn-group btn-group-sm"></div>');
        $('.btn-group', dropdowns).append(`<button type="button" class="btn btn-secondary btn-no-outline sch-command-copy" data-filename="${record.filename}"><small>コマンドをコピー</small><i class="fa fa-clipboard" aria-hidden="true"></i></button>`);
        $('.btn-group', dropdowns).append('<button type="button" class="btn btn-secondary dropdown-toggle dropdown-toggle-split" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><span class="sr-only">Toggle Dropdown</span></button>');
        $('.btn-group', dropdowns).append('<div class="dropdown-menu"></div>');
        $('.dropdown-menu', dropdowns).append('<h6 class="dropdown-header">その他操作</h6>');
        $('.dropdown-menu', dropdowns).append(`<a class="dropdown-item" href="${schematicsAPI.getDownloadURL(record.filename)}">ダウンロード <i class="fa fa-download" aria-hidden="true" /></a>`);
        $('.dropdown-menu', dropdowns).append(`<a class="dropdown-item sch-file-delete" href="#" data-filename="${record.filename}">削除 <i class="fa fa-trash" aria-hidden="true" /></a>`);

        return dropdowns.html();
      }
    },
  ],
  onRefresh: () => {
    schematicsAPI.reload((error, data) => {
      schFilesHelper.updateData(data);
      lastUpdateTime = Date.now(); startUTDisplay();
    });
  }
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