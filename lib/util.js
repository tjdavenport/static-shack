const fs = require('fs');
const path = require('path');

function readFile(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) return reject(err);
      resolve(data);
    })
  });
}

function buildPage(projectConfig, pagePath) {
  return Promise.all([
    readFile(path.join(pagePath, 'page.json')),
    readFile(path.join(pagePath, 'index.html')),
  ]).then(([ pageConfig, html ]) => {
    return { 
      ...Object.assign({}, projectConfig, JSON.parse(pageConfig)),
      html,
      __name: path.parse(pagePath).name,
    };
  });
}

module.exports = { readFile, buildPage };
