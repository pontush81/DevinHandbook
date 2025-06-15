FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN ls -l /app/tsconfig.json

RUN tsc -p tsconfig.json

CMD ["node", "dist/analyze-worker.js"] 