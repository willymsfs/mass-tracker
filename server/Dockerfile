# Use Node LTS image
FROM node:18

WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install
COPY ./src ./src
COPY ./prisma ./prisma

# Generate Prisma client and run migrations
RUN npx prisma generate
RUN npx prisma migrate deploy

EXPOSE 5000
CMD ["npm", "start"]

