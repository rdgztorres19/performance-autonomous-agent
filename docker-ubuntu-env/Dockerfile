FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Python 3, Node.js 18, OpenSSH, and base tooling
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    procps \
    coreutils \
    curl \
    ca-certificates \
    gnupg \
    openssh-server \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && echo 'root:root' | chpasswd \
    && sed -i 's/#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config \
    && sed -i 's/#PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config

EXPOSE 22

WORKDIR /root
USER root

CMD mkdir -p /run/sshd && /usr/sbin/sshd -D -e
