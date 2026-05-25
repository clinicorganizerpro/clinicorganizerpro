FROM node:20-alpine

WORKDIR /app

COPY project/package*.json ./project/
RUN cd project && npm ci

COPY project ./project

WORKDIR /app/project

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start:railway"]
