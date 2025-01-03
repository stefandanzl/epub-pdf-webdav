FROM alpine

ENV WEBDAV_URL=http://localhost
ENV WEBDAV_USERNAME=user
ENV WEBDAV_PASSWORD=pass

ENV XDG_RUNTIME_DIR=/tmp/runtime-appuser
RUN mkdir -p $XDG_RUNTIME_DIR && \
    chmod 700 $XDG_RUNTIME_DIR && \
    chown appuser:appuser $XDG_RUNTIME_DIR

RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories && \
    echo "http://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories && \
    apk update && \
    apk add --no-cache calibre nodejs npm

# Create non-root user
RUN adduser -D appuser && \
    mkdir -p /app/temp && \
    chown -R appuser:appuser /app

WORKDIR /app

COPY --chown=appuser:appuser package*.json ./
COPY --chown=appuser:appuser public ./public
COPY --chown=appuser:appuser app.js .

USER appuser
RUN npm install

EXPOSE 3000

CMD ["node", "app.js"]