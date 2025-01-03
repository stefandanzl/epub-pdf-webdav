FROM linuxserver/calibre

ENV WEBDAV_URL=http://localhost
ENV WEBDAV_USERNAME=user
ENV WEBDAV_PASSWORD=pass

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy application files
COPY public ./public
COPY app.js .

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "app.js"]