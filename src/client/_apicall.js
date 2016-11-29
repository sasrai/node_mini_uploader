class SchematicsAPI {
  constructor(apiURL) {
    this.apiURL = `${apiURL}/schematics`;
  }

  reload(callback) {
    axios.get(`${this.apiURL}?${Date.now()}`)
    .then((response) => {
      if (callback && typeof callback === 'function') callback(null, response.data);
    })
    .catch((error) => {
      console.log(error);
      if (callback && typeof callback === 'function') callback(error, null);
    });
  }

  getDownloadURL(file) {
    return `${this.apiURL}/${file}/download`;
  }

  uploadFile(file, props, callback) {
    var data = new FormData();
    for (var k in props) {
      data.append(k, props[k]);
    }
    data.append('sch_file', file);

    axios.post(`${this.apiURL}/upload`, data)
    .then((response) => {
      if (callback && typeof callback == 'function') callback(null, response);
    })
    .catch((error) => {
      console.log(error);
      if (callback && typeof callback == 'function') callback(error, null);
    })
  }

  deleteFile(file, delete_key, callback) {
    var data = new FormData();
    data.append('delete_key', getHashedDeleteKey(delete_key));
    axios.delete(`${this.apiURL}/${file}`, {
      data: data
    })
    .then((response) => {
      if (callback && typeof callback == 'function') callback(null, response);
    })
    .catch((error) => {
      console.log(error);
      if (callback && typeof callback == 'function') callback(error, null);
    });
  }
}

const schematicsAPI = new SchematicsAPI('./api');
