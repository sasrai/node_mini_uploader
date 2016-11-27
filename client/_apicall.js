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

function deleteSchematicFile(file, delete_key) {
  var data = new FormData();
  data.append('delete_key', getHashedDeleteKey(delete_key));
  axios.delete(`${uploaderApiURL}/schematics/${file}`, {
    data: data
  })
  .then((response) => {
    reloadSchematics();
    setTimeout(() => swal(`${response.data.file.filename}を削除しました`, "", "success"), 500);
  })
  .catch((error) => {
    console.log(error);
    setTimeout(() => swal(`${file}の削除に失敗しました`, "挙動おかしい時は鯖管に教えてあげてね", "error"), 500);
  });
}
