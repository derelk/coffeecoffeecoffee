import config from 'config';
import debug from 'debug';
import http from 'http';
import ErrnoException = NodeJS.ErrnoException;

import { app } from './app';

const debugLog = debug('coffeecoffeecoffee:server');

// Get port from environment and store in Express.
const port = normalizePort(config.get('server.port'));

let server: http.Server;
app.
then((app) => {
    app.set('port', port);
    server = http.createServer(app);
    server.on('error', onError);
    server.on('listening', onListening);
    server.listen(port);
}).
catch((err) => {
    console.error('Failed to initialize app: %s', err.message);
    process.exitCode = 1;
});

/**
 * Normalize a port into a number, string, or false.
 * @param {string} val
 * @returns {any}
 */
function normalizePort(val: string): any {
    let portValue = parseInt(val, 10);

    if (isNaN(portValue)) {
        // named pipe
        return val;
    } else if (portValue >= 0) {
        // port number
        return portValue;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 * @param {NodeJS.ErrnoException} error
 */
function onError(error: ErrnoException) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    let bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
    let addr = server.address();
    let bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debugLog('Listening on ' + bind);
}
