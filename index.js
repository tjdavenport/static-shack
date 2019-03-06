const app = require('./lib/app');
const path = require('path');

app(path.join(process.cwd(), 'test', 'fixture')).listen(1337);
