FROM golang:1.14.6-alpine3.12
ENV EVENTNATIVE_USER=enhosted
ENV SERVER_STATIC_FILES_DIR="/home/$EVENTNATIVE_USER/app/web"

RUN echo "@testing http://nl.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories
RUN apk add git make bash npm shadow@testing yarn

ADD . /go/src/github.com/ksensehq/$EVENTNATIVE_USER
RUN groupadd -r $EVENTNATIVE_USER \
    && useradd -r -d /home/$EVENTNATIVE_USER -g $EVENTNATIVE_USER $EVENTNATIVE_USER \
    && mkdir -p /home/$EVENTNATIVE_USER/app/res \
    && mkdir -p /home/$EVENTNATIVE_USER/app/web \
    && chown -R $EVENTNATIVE_USER:$EVENTNATIVE_USER /home/$EVENTNATIVE_USER \
    && chown -R $EVENTNATIVE_USER:$EVENTNATIVE_USER /home/$EVENTNATIVE_USER/app \
    && chown -R $EVENTNATIVE_USER:$EVENTNATIVE_USER /home/$EVENTNATIVE_USER/app/res \
    && chown -R $EVENTNATIVE_USER:$EVENTNATIVE_USER /home/$EVENTNATIVE_USER/app/web \
    && chown -R $EVENTNATIVE_USER:$EVENTNATIVE_USER /go/src/github.com/ksensehq/$EVENTNATIVE_USER

USER $EVENTNATIVE_USER
WORKDIR /go/src/github.com/ksensehq/$EVENTNATIVE_USER
RUN make

RUN cp -r /go/src/github.com/ksensehq/$EVENTNATIVE_USER/build/dist/* /home/$EVENTNATIVE_USER/app

USER root
RUN rm -rf /go/ \
    && rm -rf /usr/local/go
USER $EVENTNATIVE_USER
WORKDIR /home/$EVENTNATIVE_USER

EXPOSE 8001
ENTRYPOINT /home/$EVENTNATIVE_USER/app/$EVENTNATIVE_USER -cfg=/home/$EVENTNATIVE_USER/app/res/configuration.yaml
