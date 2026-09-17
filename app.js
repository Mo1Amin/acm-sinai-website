// Startup file for cPanel "Setup Node.js App" (Phusion Passenger) and for local runs.
process.env.TZ = 'Africa/Cairo';

const { createApp } = require('./src/server');
const config = require('./src/config');

const app = createApp();
const port = process.env.PORT || config.port;

app.listen(port, () => {
  console.log(`ACM Sinai website listening on ${port} (${config.env})`);
});
