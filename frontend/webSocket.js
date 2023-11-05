class Socket {

  constructor(path = '') {
    this.path = path
    this.socketClosed = true
    this.listeners = {}
    this.connect()
    this.forceFullDisconnect = false
    this.disconnectTimer = null
    this.socketConnectTimeout = null

    document.addEventListener('visibilitychange', (event) => {
      if (document.visibilityState === 'hidden') {
        if (this.disconnectTimer === null) {
          this.disconnectTimer = setTimeout(this.disconnect, 1800000) // Disconnect after 30min idle
        }
      } else {
        if (this.disconnectTimer !== null) {
          clearTimeout(this.disconnectTimer)
          this.disconnectTimer = null
        }
        if (this.socketClosed) {
          if (this.socketConnectTimeout !== null) {
            clearTimeout(this.socketConnectTimeout)
            this.socketConnectTimeout = null
          }
          this.forceFullDisconnect = false
          this.connect()
        }
      }
    })
  }

  disconnect = () => {
    this.forceFullDisconnect = true
    this.disconnectTimer = null
    this.socket.close(3010, 'Idle connection.')
  }

  connect = (cb) => {
    this.socket = new WebSocket(location.protocol.replace('http', 'ws') + '//' + location.host + this.path);
    // Connection opened
    this.socket.addEventListener('open', (event) => {
      this.socketClosed = false;
      console.log('Websocket connected');
      this.emit('open', this.socket)
      if (cb && typeof cb === 'function') {
        cb();
      }
    });

    // Listen for messages
    this.socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'pong') {
        pingTimeout = this.ping()
      } else {
        this.emit(data.type, data.data)
      }
    });

    let pingTimeout = this.ping()

    this.socket.addEventListener('close', () => {
      clearTimeout(pingTimeout)
      this.socketClosed = true
      if (!this.forceFullDisconnect) {
        this.socketConnectTimeout = setTimeout(this.connect, 10000);
        console.log('Websocket disconnected, retying in 10s')
        this.emit('close')
      }
    })
  }

  ping = () => {
    return setTimeout(() => {
      this.send('ping')
    }, 45000);
  }

  send = (type, data) => {
    if (this.socketClosed) {
      clearTimeout(this.socketConnectTimeout)
      this.socketConnectTimeout = null
      this.connect(() => {
        this.send(type, data)
      });
    } else {
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
    console.log('ws emit: ' + key)
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

export default Socket