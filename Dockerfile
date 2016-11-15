FROM node:7.1

# create cache directory
RUN mkdir /.npm
RUN chown -R 1000.1000 /.npm

WORKDIR /app

ENV ENTRYKIT_VERSION 0.4.0

# Install Entrykit
RUN apt-get install -y openssl \
  && wget https://github.com/progrium/entrykit/releases/download/v${ENTRYKIT_VERSION}/entrykit_${ENTRYKIT_VERSION}_Linux_x86_64.tgz \
  && tar -xvzf entrykit_${ENTRYKIT_VERSION}_Linux_x86_64.tgz \
  && rm entrykit_${ENTRYKIT_VERSION}_Linux_x86_64.tgz \
  && mv entrykit /bin/entrykit \
  && chmod +x /bin/entrykit \
  && entrykit --symlink

ENTRYPOINT [ "prehook", "node -v", "--" \
# , "prehook", "bundle install -j4 --quiet --path vendor/bundle", "--" \
  , "prehook", "npm install --no-optional", "--" \
# , "prehook", "bower install --allow-root", "--" \
# , "prehook", "sh docker/xvfb.sh", "--" \
# , "prehook", "ruby docker/setup.rb", "--"
  ]
