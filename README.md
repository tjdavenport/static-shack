# static-shack
A simple static site generator 

## Quickstart

Run the following
```
yarn add static-shack
npx static-shack init
npx static-shack page default
npx static-shack page foobar
```

Which will produce
```
dist/          - The compiled site will be placed inside here
assets/        - Put scripts, styles, images here
layouts/       - Put page layouts here
  default.html
pages/         - Every page is a folder with an index.html and page.json file
  default/     - "default" page will route to / (the root of the site)
    index.html
    page.json  - keys in this file will be availble to the page's index.html
  foobar/
    index.html
    page.json
page.json      - keys in this file will be available to all pages
```

Then run
```
npx static-shack dev
```
Which will create a barebones Expressjs server for developing the static site.

When you're done developing, run
```
npx static-shack dist
```
Which will produce
```
dist/
  assets/
  foobar/index.html
  index.html
```
