// @flow

export default class Client {
  BROKERPORT: number;
  BROKERURL: string;
  mqtt: ?any;
  client: any;
  sendData: any;

  HOST_IN: string;
  HOST_OUT: string;
  TO_CLIENT: string;

  constructor() {
    this.HOST_IN = '/host-in';
    this.HOST_OUT = '/host-out';
    this.TO_CLIENT = '/client';

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
      console.log(topic + ': ' + message);
      if (topic == this.HOST_OUT) {
        this.client.publish(this.TO_CLIENT, message);
      }
    });

    this.client.on('error', error => {
      console.log('Error raised...: ' + JSON.stringify(error));
    });

    this.client.on('packetsend', packet => {
      console.log('Client sent packet to server: ' + JSON.stringify(packet));
    });

    this.sendData = (payload: string) => {
      this.client.publish(this.HOST_IN, payload);
    };
  }
}
