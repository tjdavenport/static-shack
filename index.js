const path = require('path');
const fsx = require('fs-extra');
const app = require('./lib/app');
const dist = require('./lib/dist');
const program = require('commander');
const layout = require('./lib/layout');

program
  .command('dev')
  .option('-p, --port <n>', 'port to run express server on', parseInt)
  .option('-s, --source <path>', 'source path of static site project')
  .action(cmd => {
    const port = cmd.port || 1337;
    app(cmd.source || process.cwd()).listen(port, () => {
      console.log(`Listening on port ${port}`);
    });
  });

program
  .command('dist')
  .description('Compile and write site. WILL EMPTY DESTINATION DIRECTORY!')
  .option('-s, --source <path>', 'source path of static site project')
  .option('-d, --dest <path>', `destination to place compiled site, defaults to ${path.join(process.cwd(), 'dist')}`)
  .action(cmd => {
    const destPath = cmd.dest || path.join(process.cwd(), 'dist');
    const sourcePath = cmd.source || process.cwd();

    dist(sourcePath, destPath)
      .then(() => {
        console.log(`Wrote site to ${destPath}`);
        process.exit(0);
      })
      .catch(err => {
        console.log(err);
        process.exit(1);
      });
  });

program
  .command('init')
  .action(async cmd => {
    try {
      await Promise.all(['assets', 'layouts', 'pages'].map(folderName => {
        console.log(`Creating ${folderName} directory`);
        return fsx.mkdir(folderName);
      }));
      await fsx.writeFile(path.join('layouts', 'default.html'), layout);
      await fsx.writeFile('page.json', '{ "layout": "default.html" }');
      console.log('Generated site');
    } catch (err) {
      console.log(err);
      process.exit(1);
    }
  });

program
  .command('page <name>')
  .action(async (name, cmd) => {
    try {
      await fsx.mkdir(path.join('pages', name));
      await fsx.writeFile(path.join('pages', name, 'index.html'), '<p>foo</p><p>bar</p>');
      await fsx.writeFile(path.join('pages', name, 'page.json'), '{\n}');
      console.log('Added page');
    } catch (err) {
      console.log(err);
      process.exit(1);
    }
  });

program.parse(process.argv);
