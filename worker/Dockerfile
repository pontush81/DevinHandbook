FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

WORKDIR /app/worker

RUN ls -l /app/worker/tsconfig.json

RUN npm run build

CMD ["node", "dist/analyze-worker.js"] 