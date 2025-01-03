#FROM linuxserver/calibre
FROM alpine

ENV WEBDAV_URL=http://localhost
ENV WEBDAV_USERNAME=user
ENV WEBDAV_PASSWORD=pass

RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories \
    echo "http://dl-cdn.alpinelinux.org/alpine/edge/community" >> /etc/apk/repositories \
    apk add calibre

# Install Node.js
#RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
#    apt-get install -y nodejs
RUN apk add nodejs
WORKDIR /app

# Copy package files
COPY package*.json ./


# Copy application files
COPY public ./public
COPY app.js .

RUN npm install

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "app.js"]