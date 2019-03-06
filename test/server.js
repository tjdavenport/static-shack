const fs = require('fs');
const path = require('path');
const axios = require('axios');
const assert = require('assert');
const app = require('../lib/app');
const cheerio = require('cheerio');

describe('development server', function() {
  const fixturePath = path.join(process.cwd(), 'test', 'fixture');
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
        const $ = cheerio.load(html);

        if (config.layout) {
          assert(!$('#column2').length);
        } else {
          assert($('#column2').length);
        }

        assert(['Static Shock', 'About'].includes($('title').text()));
      });
    })
  });

  after(done => {
    server.close();
    done();
  });

});
