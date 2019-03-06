const fs = require('fs');
const ejs = require('ejs');
const path = require('path');
const express = require('express');

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
    };
  });
}

module.exports = function(projectPath) {
  const app = express();

  app.get('/:page', async (req, res, next) => {
    try {
      const projectConfig = await readFile(path.join(projectPath, 'page.json'));
      const page = await buildPage(JSON.parse(projectConfig), path.join(projectPath, req.params.page));
      const layoutHtml = await readFile(path.join(projectPath, 'layouts', page.layout));

      return res.send(ejs.render(layoutHtml, {
        ...page, 
        content: ejs.render(page.html, page),
      }));
    } catch(err) {
      // TODO - maybe add some more descriptive errors here
      next(err);
    }
  });

  return app;
}
