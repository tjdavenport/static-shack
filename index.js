const path = require('path');
const app = require('./lib/app');
const dist = require('./lib/dist');
const fsp = require('fs').promises;
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
        return fsp.mkdir(path.join(process.cwd(), folderName));
      }));
      await fsp.writeFile(path.join(process.cwd(), 'layouts', 'default.html'), layout);
      await fsp.writeFile(path.join(process.cwd(), 'page.json'), '{ "layout": "default.html" }');
      console.log('Generated site');
    } catch (err) {
      console.log(err);
      process.exit(1);
    }
  });

program.parse(process.argv);
