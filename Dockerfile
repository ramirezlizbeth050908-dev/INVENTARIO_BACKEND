FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY app ./app
EXPOSE 8000
CMD ["npm", "start"]
