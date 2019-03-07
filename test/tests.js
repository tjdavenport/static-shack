const fs = require('fs');
const path = require('path');
const axios = require('axios');
const rimraf = require('rimraf');
const assert = require('assert');
const app = require('../lib/app');
const cheerio = require('cheerio');
const dist = require('../lib/dist');

const fixturePath = path.join(process.cwd(), 'test', 'fixture');
const tmpPath = path.join(process.cwd(), 'test', 'tmp');

function assertRenderedPage(html, config) {
  const $ = cheerio.load(html);

  assert(['Static Shock', 'About'].includes($('title').text()));
  if (config.layout) {
    assert(!$('#column2').length);
  } else {
    assert($('#column2').length);
  }
}

describe('development server', function() {
  let server, staticShock;

  before(done => {
    staticShock = app(fixturePath);
    server = staticShock.listen(1337, done);
  });

  it('serves rendered pages', function() {
    const getters = [];

    fs.readdirSync(fixturePath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && (dirent.name !== 'layouts'))
      .forEach(dirent => {
        getters.push(axios.get(`http://localhost:1337/${dirent.name}`).then(res => {
          return { 
            dirent, 
            html: res.data,
            config: require(path.join(fixturePath, dirent.name, 'page.json')),
          };
        }));
      });

    return Promise.all(getters).then(gets => {
      gets.forEach(({ dirent, html, config }) => {
        assertRenderedPage(html, config);
      });
    })
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
        const config = require(path.join(fixturePath, page.__name, 'page.json'));
        assertRenderedPage(html, config);
      });
    });
  });

  after(done => {
    const dirents = fs.readdirSync(tmpPath, { withFileTypes: true });

    dirents.forEach(dirent => {
      if (dirent.isDirectory()) {
        rimraf.sync(path.join(tmpPath, dirent.name))
      } else {
        fs.unlinkSync(path.join(tmpPath, dirent.name));
      }
    });

    done();
  });

});





