FROM debian:jessie

MAINTAINER Ivan Dyachkov <ivan@dyachkov.org>

ADD https://deb.nodesource.com/setup_0.12 /
RUN /bin/bash setup_0.12
# make and g++ are for nodejs bcrypt module
RUN apt-get install -y nodejs graphicsmagick make g++
WORKDIR /pepyatka
COPY . .
RUN npm install
ENV NODE_ENV development
EXPOSE 3000
CMD ["node", "index.js"]
