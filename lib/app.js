const ejs = require('ejs');
const path = require('path');
const express = require('express');
const { readFile, buildPage } = require('./util');

module.exports = function(projectPath) {
  const app = express();

  app.set('etag', false);
  app.use('/assets', express.static(path.join(projectPath, 'assets')));
  app.get('/:page?', async (req, res, next) => {
    try {
      const projectConfig = await readFile(path.join(projectPath, 'page.json'));
      const page = await buildPage(JSON.parse(projectConfig), path.join(projectPath, 'pages', req.params.page || 'default'));
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
