FROM registry.access.redhat.com/ubi8/ubi:8.3

ENV RATE_HOME=/opt/rate

RUN yum install -y nodejs && \ 
    yum clean all

WORKDIR ${RATE_HOME}/app

COPY package.json ${RATE_HOME}/app

RUN npm install

COPY . ${RATE_HOME}/app

RUN groupadd -r rate -f -g 1001 \
 && useradd -u 1001 -r -g rate -m -d ${RATE_HOME} -s /sbin/nologin \
 -c "Rate User" rate \
 && chown -R rate:rate ${RATE_HOME} \
 && chmod -R 755 ${RATE_HOME}

USER rate

EXPOSE 8080
CMD ["npm", "start"]
