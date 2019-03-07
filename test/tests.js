const fs = require('fs');
const path = require('path');
const axios = require('axios');
const rimraf = require('rimraf');
const assert = require('assert');
const app = require('../lib/app');
const cheerio = require('cheerio');
const dist = require('../lib/dist');
const childProcess = require('child_process');

const fixturePath = path.join(process.cwd(), 'test', 'fixture');
const pagesPath = path.join(fixturePath, 'pages');
const tmpPath = path.join(process.cwd(), 'test', 'tmp');

function cleanTmp(cb) {
  const dirents = fs.readdirSync(tmpPath, { withFileTypes: true });

  dirents.forEach(dirent => {
    if (dirent.isDirectory()) {
      rimraf.sync(path.join(tmpPath, dirent.name))
    } else {
      fs.unlinkSync(path.join(tmpPath, dirent.name));
    }
  });
  cb();
}

function assertRenderedPage(html, config) {
  const $ = cheerio.load(html);

  assert(['Static Shock', 'About'].includes($('title').text()));
  if (config.layout) {
    assert(!$('#column2').length);
  } else {
    assert($('#column2').length);
  }
}

function assertSite() {
  return fs.readdirSync(pagesPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => {
      const uri = (dirent.name === 'default') ? '' : '/'+dirent.name;

      return axios.get(`http://localhost:1337${uri}`).then(res => {
        const page = { 
          dirent, 
          html: res.data,
          config: require(path.join(pagesPath, dirent.name, 'page.json')),
        };
        assertRenderedPage(page.html, page.config);
      });
    });
}


describe('development server', function() {
  let server, staticShock;

  before(done => {
    staticShock = app(fixturePath);
    server = staticShock.listen(1337, done);
  });

  it('serves rendered pages', function() {
    return Promise.all(assertSite());
  });

  it('serves static assets from /assets', function() {
    return axios.get('http://localhost:1337/assets/foobar.js')
      .then(res => {
        assert(res.data.includes('alert'));
      });
  });

  after(done => {
    server.close();
    done();
  });

});

describe('dist', function() {

  it('compiles and writes pages to disk', function() {
    const projectConfig = require(path.join(fixturePath, 'page.json'));

    return dist(fixturePath, tmpPath).then(pages => {
      pages.forEach(page => {
        const html = fs.readFileSync(page.__writePath, 'utf8');
        const config = require(path.join(pagesPath, page.__name, 'page.json'));
        assertRenderedPage(html, config);
      });
    });
  });

  after(done => {
    cleanTmp(done);
  });

});

describe('cli tool', function() {

  function spawnStatic(args, readyStr) {
    return new Promise((resolve, reject) => {
      const proc = childProcess.spawn('node', args);
      proc.stdout.on('data', data => {
        if (data.toString().includes(readyStr)) {
          resolve(proc);
        }
      });
      proc.on('error', err => {
        reject(err);
      });
    });
  }

  function spawnHttp() {
    return new Promise((resolve, reject) => {
      const proc = childProcess.spawn('npx', ['http-server', '-p', '1337'], {
        cwd: tmpPath,
      });
      proc.stdout.on('data', data => {
        if (data.toString().includes('1337')) {
          resolve(proc);
        }
      });
      proc.on('error', err => {
        reject(err);
      });
    });
  }

  it('supports dev command', function() {
    return spawnStatic(['index.js', 'dev', '-s', 'test/fixture'], 'Listening')
      .then(proc => {
        return Promise.all(assertSite())
          .finally(() => {
            proc.kill();
          });
      });
  });

  it('supports a dist command', function() {
    return spawnStatic(['index.js', 'dist', '-d', tmpPath, '-s', fixturePath], 'Wrote site')
      .then(proc => {
        return spawnHttp();
      })
      .then(proc => {
        return Promise.all(assertSite())
          .finally(() => {
            proc.kill();
          });
      });
  });

  after(done => {
    cleanTmp(done);
  });

});
