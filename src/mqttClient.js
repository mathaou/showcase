// @flow

/*=============================================================+
 |Tried using the tonaljs enharmonic module, but I guess it was|
 |~-~-~doing that NEEDED TO BE IN C thing again. Garbage.-~-~-~|
 +=============================================================*/

export default class Client {
  BROKERPORT: number;
  BROKERURL: string;
  mqtt: ?any;
  client: any;
  sendData: any;
  chordArray: any;

  HOST_IN: string;
  HOST_OUT: string;
  socket: any;
  setSocket: any;
  setChordArray: any;
  arrayBufferToString: any;

  constructor() {
    this.HOST_IN = '/host-in';
    this.HOST_OUT = '/host-out';

    this.BROKERPORT = 1883;
    this.BROKERURL = 'localhost';
    this.mqtt = require('mqtt');

    this.client = this.mqtt.connect(this.BROKERURL, {
      clientId: 'client',
      port: this.BROKERPORT,
      protocol: 'MQTT',
    });

    this.Client();
  }

  Client() {
    this.client.on('connect', connack => {
      console.log('Connecting...: ' + JSON.stringify(connack));
      this.client.subscribe(this.HOST_OUT);
    });

    this.client.on('disconnect', packet => {
      console.log('Disconnecting...: ' + JSON.stringify(packet));
    });

    this.client.on('message', (topic, message) => {
      console.log(`JS: ${topic} - ${message}`);
      /*=============================================+
       |This relays mqtt responses to a set websocket|
       +=============================================*/
      if (topic == this.HOST_OUT && this.socket) {
        var parsedMessage = JSON.parse(this.arrayBufferToString(message));

        parsedMessage = parsedMessage.map(chord => {
          return chord.replace('B#', 'C').replace('E#', 'F');
        });

        parsedMessage = [... new Set(parsedMessage)];

        this.socket.emit('client', {data: parsedMessage});
      }
    });

    this.client.on('error', error => {
      console.log('Error raised...: ' + JSON.stringify(error));
    });

    this.client.on('packetsend', packet => {
      // console.log('Client sent packet to server: ' + JSON.stringify(packet));
    });

    this.sendData = (payload: string) => {
      this.client.publish(this.HOST_IN, payload);
    };

    this.setSocket = (socket: any) => {
      this.socket = socket;
    };

    this.setChordArray = (chordArray: any) => {
      this.chordArray = chordArray;
    };

    this.arrayBufferToString = buf => {
      return new TextDecoder('utf-8').decode(buf);
    };
  }
}
