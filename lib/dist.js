const ejs = require('ejs');
const path = require('path');
const fsx = require('fs-extra');
const { readFile, buildPage } = require('./util');

function listPages(pagesPath) {
  return new Promise((resolve, reject) => {
    fsx.readdir(pagesPath, { withFileTypes: true }, (err, dirents) => {
      if (err) return reject(err);

      const pages = dirents
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      resolve(pages);
    });
  });
}

function writePages(projectPath, destinationPath, pages, layouts) {
  return Promise.all(pages.map(page => {
    return new Promise((resolve, reject) => {
      if (page.__name === 'default') {
        page.__writePath = path.join(destinationPath, 'index.html');
        page.__rendered = ejs.render(layouts[page.layout], {
          ...page, 
          content: ejs.render(page.html, page),
        });
        fsx.writeFile(
          page.__writePath,
          page.__rendered,
          err => {
            if (err) reject(err);
            resolve(page);
          },
        );
      } else {
        fsx.mkdir(path.join(destinationPath, page.__name), err => {
          if (err) reject(err);
          page.__writePath = path.join(destinationPath, page.__name, 'index.html');
          page.__rendered = ejs.render(layouts[page.layout], {
            ...page, 
            content: ejs.render(page.html, page),
          });
          fsx.writeFile(
            page.__writePath,
            page.__rendered,
            err => {
              if (err) reject(err);
              resolve(page);
            },
          );
        });
      }
    });
  })); 
}

function readLayouts(projectPath) {
  const layoutPath = path.join(projectPath, 'layouts');

  return new Promise((resolve, reject) => {
    fsx.readdir(layoutPath, {}, (err, filenames) => {
      if (err) return reject(err);
      return resolve(filenames);
    })
  }).then(filenames => {
    const reads = [];
    filenames.forEach(filename => {
      reads.push(readFile(path.join(layoutPath, filename)).then(html => {
        return { html, filename };
      }));
    });
    return Promise.all(reads);
  });
}

function copyAs(projectPath) {
  return fsx.copy(path.join(projectPath, 'assets'))
    .then(filenames => {
      return Promise.all(filenames.map(filename => {
        return fsx.readFile(path.join(projectPath, 'assets', filename), 'utf8')
          .then(data => {
            return { filename, data };
          });
      }));
    });
};

module.exports = function(projectPath, destinationPath) {
  return new Promise(async (resolve, reject) => {
    try {
      await fsx.emptyDir(path.join(destinationPath));
      const { projectConfig, layouts, pageNames, assets } = await Promise.all([
        readFile(path.join(projectPath, 'page.json')),
        readLayouts(projectPath),
        listPages(path.join(projectPath, 'pages')),
        fsx.copy(path.join(projectPath, 'assets'), path.join(destinationPath, 'assets')),
      ]).then(([ rawConfig, layouts, pageNames ]) => { 
        return { 
          projectConfig: JSON.parse(rawConfig), 
          layouts: layouts.reduce((cache, data) => {
            cache[data.filename] = data.html;
            return cache;
          }, {}),
          pageNames,
        };
      });
      const pages = await Promise.all(pageNames.map(name => {
        return buildPage(projectConfig, path.join(projectPath, 'pages', name));
      }));

      resolve(await writePages(projectPath, destinationPath, pages, layouts));
    } catch (err) {
      reject(err);
    }
  });
}
