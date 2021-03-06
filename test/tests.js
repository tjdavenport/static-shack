const path = require('path');
const axios = require('axios');
const fsx = require('fs-extra');
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
  const dirents = fsx.readdirSync(tmpPath, { withFileTypes: true });

  dirents.forEach(dirent => {
    if (dirent.isDirectory()) {
      rimraf.sync(path.join(tmpPath, dirent.name))
    } else {
      fsx.unlinkSync(path.join(tmpPath, dirent.name));
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
  return fsx.readdirSync(pagesPath, { withFileTypes: true })
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
  let pages;

  before(async () => {
    pages = await dist(fixturePath, tmpPath);
  });

  it('compiles and writes pages to disk', function(done) {
    const projectConfig = require(path.join(fixturePath, 'page.json'));
    pages.forEach(page => {
      const html = fsx.readFileSync(page.__writePath, 'utf8');
      const config = require(path.join(pagesPath, page.__name, 'page.json'));
      assertRenderedPage(html, config);
    });
    done();
  });

  it('copies assets over to dist', async function() {
    const script = await fsx.readFile(path.join(tmpPath, 'assets', 'foobar.js'), 'utf8');
    const styles = await fsx.readFile(path.join(tmpPath, 'assets', 'styles.css'), 'utf8');

    assert(script.includes('alert'));
    assert(styles.includes('font-size'));
  });

  after(done => {
    cleanTmp(done);
  });

});

describe('cli tool', function() {

  function spawnStatic(args, readyStr, options = {}) {
    return new Promise((resolve, reject) => {
      const proc = childProcess.spawn('node', args, options);
      proc.stdout.on('data', data => {
        if (data.toString().includes(readyStr)) {
          resolve(proc);
        }
      });
      proc.on('error', err => {
        console.log(err);
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

  it('supports a dist command', async function() {
    await spawnStatic(['index.js', 'dist', '-d', tmpPath, '-s', fixturePath], 'Wrote site')
    await spawnStatic(['index.js', 'dist', '-d', tmpPath, '-s', fixturePath], 'Wrote site')
    const http = await spawnHttp();
    await Promise.all(assertSite());
    http.kill();
  });

  it('supports init and page commands', async function() {
    await spawnStatic([path.join('..', '..', 'index.js'), 'init'], 'Generated site', { cwd: tmpPath })
    await spawnStatic([path.join('..', '..', 'index.js'), 'page', 'foo'], 'Added page', { cwd: tmpPath })
    await fsx.access(path.join(tmpPath, 'layouts', 'default.html'));
    await fsx.access(path.join(tmpPath, 'pages', 'foo', 'index.html'));
  });

  afterEach(done => {
    cleanTmp(done);
  });

});
