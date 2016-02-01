FROM mhart/alpine-node:5.5

WORKDIR /src

COPY package.json /src/
RUN npm install
COPY . /src/

CMD ["npm", "start"]
