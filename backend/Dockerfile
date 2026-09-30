FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
# Certificado de RDS para conexión SSL verificada
ADD https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /app/global-bundle.pem
RUN chmod 644 /app/global-bundle.pem
USER node
EXPOSE 3000
CMD ["node", "server.js"]
