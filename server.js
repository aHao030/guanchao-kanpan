const { createServer } = require('./server/create-server.cjs');

if (require.main === module) {
  const host = process.env.HOST || '127.0.0.1';
  const port = process.env.PORT === undefined ? 8791 : Number(process.env.PORT);
  const server = createServer();
  server.listen(port, host, () => console.log(`观潮看盘 demo: http://${host}:${server.address().port}`));
}

module.exports = { createServer };
