# node_mini_uploader
WorldEdit用の簡易あぷろだ

# 使い方
- .envにschematicsディレクトリのパスを記述(相対orフルパス)
- APIサーバをdockerで起動(下記のコマンド参考)
- nginxでAPIのリバースプロキシ設定(htmlから./api/でアクセスできる事)とclient用のhtmlの静的配信設定する

これでとりあえず動く(はず)。

### docker起動コマンド
```bash
docker-compose build
docker-compose up -d
```

### nginx設定例
```nginx.conf
upstream uploader-api {
  server 127.0.0.1:8334;
}
server {
  // 中略...
  
  location /foo/uploader/api {
    auth_basic "この先はパスワード保護されています";
    auth_basic_user_file /etc/nginx/htpw/.htpasswd;

    proxy_pass http://uploader-api/;
  }
  location /foo/uploader {
    auth_basic "この先はパスワード保護されています";
    auth_basic_user_file /etc/nginx/htpw/.htpasswd;

    alias /foo/var/uploader/client/;
    try_files $uri $uri/ =404;
  }
}
```
