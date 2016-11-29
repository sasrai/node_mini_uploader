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