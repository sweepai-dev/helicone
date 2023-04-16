FROM node:19

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install

COPY . .
RUN yarn build

EXPOSE 3000

CMD ["node", "bin/index.js"]
