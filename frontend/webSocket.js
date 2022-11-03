class Socket {

  constructor() {
    this.socketClosed = true
    this.listeners = {}
    this.connect()
  }

  connect = (cb) => {
    this.socket = new WebSocket(location.protocol.replace('http', 'ws') + '//' + location.host);
    // Connection opened
    this.socket.addEventListener('open', (event) => {
      this.socketClosed=false;
      console.log('Websocket connected');
      if (cb && typeof cb === 'function') {
        cb();
      }
    });

    // Listen for messages
    this.socket.addEventListener('message', (event) => {
      console.log('Message from server ', event.data);
      const data = JSON.parse(event.data);
      if (data.type === 'pong') {
        pingTimeout = this.ping()
      }
      else {
        this.emit(data.type, data.data)
      }
    });

    let pingTimeout = this.ping()

    this.socket.addEventListener('close', () => {
      clearTimeout(pingTimeout)
      this.socketClosed = true
      this.socketConnectTimeout = setTimeout(this.connect, document.visibilityState === "hidden" ? 300000 : 30000);
      console.log('Websocket disconnected')
    })
    this.emit('open', this.socket)
  }

  ping = () => {
    return setTimeout(() => {
      this.send('ping')
    }, 45000);
  }

  send = (type, data) => {
    if (this.socketClosed) {
      clearTimeout(this.socketConnectTimeout)
      this.connect(() => {
        this.send(type, data)
      });
    }
    else {
      const sendData = {
        type
      }
      if (data) {
        sendData.data = data;
      }
      this.socket.send(JSON.stringify(sendData))
    }
  }

  emit(key, data) {
    console.log(key)
    if (key in this.listeners) {
      for (const listener of this.listeners[key]) {
        listener(data)
      }
    }
  }

  on(key, callback) {
    if (!(key in this.listeners)) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(callback)
  }

}

module.exports = Socket