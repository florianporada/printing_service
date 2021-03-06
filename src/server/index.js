import http from 'http';
import socket from 'socket.io';

import logger from '../lib/logger';

/**
 * PrinterService Class
 *
 * @class PrinterService
 */
class PrinterService {
  constructor(props = {}) {
    this.server = http.createServer((req, res) => {
      res.writeHead(200);
      res.end('got sockets?');
    });
    this.io = socket(this.server);
    this.printers = [];
    this.port = props.port || 3030;
  }

  init() {
    this.server.listen(this.port);

    this.io.on('connection', (socket) => {
      socket.on('register_printer', (data) => {
        if (data.type === 'printer') {
          socket.name = data.name;
          socket.type = data.printer;
          socket.uid = data.uid;

          this.printers.push(socket);

          logger.info(`added ${socket.name} to printers array`);
        }
      });

      socket.on('disconnect', () => {
        if (socket.type === 'printer') {
          this.printers.splice(this.printers.indexOf(socket), 1);

          logger.info(`removed ${socket.name} from printers array`);
        }
      });
    });
  }

  /**
   * Sends a message to a connected printer
   *
   * @param {Object} data
   * @param {string} data.message.text - test which will be sent to the printer
   * @param {string} data.message.image - base64 encoded image string
   * @param {string} data.message.sender - the name of the sender
   * @param {string} data.printerUid - uid for identifying the printer
   *
   * @returns {Promise}
   *
   * @memberof PrinterService
   */
  print({ message, printerUid = 0 }) {
    return new Promise((resolve, reject) => {
      if (this.printers.length === 0) {
        logger.info('No printer connected');
        reject({
          message: 'No printer connected',
        });
      }

      this.printers.forEach((printer) => {
        if (printer.uid === printerUid) {
          printer.emit('print_message', message, (data) => {
            logger.info(data);

            resolve({
              message: `Sent message to ${printer.uid} (${printer.name})`,
            });
          });
        } else {
          reject({
            message: 'Did not find printer uid',
          });
        }
      });
    });
  }
}

export default PrinterService;
