FROM node:20-alpine

WORKDIR /app

COPY project/package*.json ./project/
RUN cd project && npm install

COPY project ./project

WORKDIR /app/project

RUN npm run build:api

ENV NODE_ENV=production
ENV PORT=8788
EXPOSE 8788

CMD ["npm", "run", "start:api"]
