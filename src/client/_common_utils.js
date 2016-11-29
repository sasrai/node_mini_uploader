function getHashedDeleteKey(rawkey) {
  if (!rawkey) return '';
  var shainfo = CryptoJS.SHA256(rawkey);
  var hashstr = '';
  for (var i = 0; i < shainfo.words.length; i++) {
    hashstr += (shainfo.words[i] >>> 0).toString(16);
  }
  return hashstr;
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

function getDateStringFromUTCMillis(millisec) {
  const date = new Date(millisec);
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  ].join( '/' ) + ' '
  + date.toLocaleTimeString();
}

function showDeleteKeyDialog(filename, isOverwrite = false, callback) {
  if (arguments.length == 2) {
    if (typeof isOverwrite === 'function') {
      callback = isOverwrite;
      isOverwrite = false;
    }
  }
  let msg = (isOverwrite) ? '上書き' : '削除';
  swal({
    title: `${msg}確認`,
    text: `<strong>${filename}</strong>を${msg}してもよろしいですか？<p><small style="font-size:9pt">※ 未記入の場合は削除キー未登録のアイテムのみ${msg}できます。</small></p>`,
    type: 'input',
    html: true,
    customClass: 'sa-delete-key-input',
    showCancelButton: true,
    cancelButtonText: 'キャンセル',
    confirmButtonColor: '#DD6B55',
    confirmButtonText: `${msg}するよ!`,
    inputPlaceholder: '削除キーを入力してください。'
  }, (inputValue) => {
    if (false !== inputValue)
      if (typeof callback === 'function') callback(inputValue);
  });
}
