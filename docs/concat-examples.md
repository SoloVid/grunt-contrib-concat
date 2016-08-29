# Usage Examples

## Specifying a dependency in code

This example demonstrates how to ensure certain files are concatenated before other files. Using the dependsOn() directive anywhere in a source file will ensure that the indicated file (which also must be included in the source) is placed concatenated before this file.

```js
dependsOn("path/relative/to/file.js");
dependsOn("/path/relative/to/project/file.js");
```

## Concatenating with a custom separator

In this example, running `grunt oconcat:dist` (or `grunt oconcat` because `oconcat` is a [multi task][multitask]) will concatenate the three specified source files (in order), joining files with `;` and writing the output to `dist/built.js`.

```js
// Project configuration.
grunt.initConfig({
  oconcat: {
    options: {
      separator: ';',
    },
    dist: {
      src: ['src/intro.js', 'src/project.js', 'src/outro.js'],
      dest: 'dist/built.js',
    },
  },
});
```

## Banner comments

In this example, running `grunt oconcat:dist` will first strip any preexisting banner comment from the `src/project.js` file, then concatenate the result with a newly-generated banner comment, writing the output to `dist/built.js`.

This generated banner will be the contents of the `banner` template string interpolated with the config object. In this case, those properties are the values imported from the `package.json` file (which are available via the `pkg` config property) plus today's date.

_Note: you don't have to use an external JSON file. It's also valid to create the `pkg` object inline in the config. That being said, if you already have a JSON file, you might as well reference it._

```js
// Project configuration.
grunt.initConfig({
  pkg: grunt.file.readJSON('package.json'),
  oconcat: {
    options: {
      stripBanners: true,
      banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %> */',
    },
    dist: {
      src: ['src/project.js'],
      dest: 'dist/built.js',
    },
  },
});
```

## Multiple targets

In this example, running `grunt oconcat` will build two separate files. One "basic" version, with the main file essentially just copied to `dist/basic.js`, and another "with_extras" concatenated version written to `dist/with_extras.js`.

While each oconcat target can be built individually by running `grunt oconcat:basic` or `grunt oconcat:extras`, running `grunt oconcat` will build all oconcat targets. This is because `oconcat` is a [multi task][multitask].

```js
// Project configuration.
grunt.initConfig({
  oconcat: {
    basic: {
      src: ['src/main.js'],
      dest: 'dist/basic.js',
    },
    extras: {
      src: ['src/main.js', 'src/extras.js'],
      dest: 'dist/with_extras.js',
    },
  },
});
```

## Multiple files per target

Like the previous example, in this example running `grunt oconcat` will build two separate files. One "basic" version, with the main file essentially just copied to `dist/basic.js`, and another "with_extras" concatenated version written to `dist/with_extras.js`.

This example differs in that both files are built under the same target.

Using the `files` object, you can have list any number of source-destination pairs.

```js
// Project configuration.
grunt.initConfig({
  oconcat: {
    basic_and_extras: {
      files: {
        'dist/basic.js': ['src/main.js'],
        'dist/with_extras.js': ['src/main.js', 'src/extras.js'],
      },
    },
  },
});
```

## Dynamic filenames

Filenames can be generated dynamically by using `<%= %>` delimited underscore templates as filenames.

In this example, running `grunt oconcat:dist` generates a destination file whose name is generated from the `name` and `version` properties of the referenced `package.json` file (via the `pkg` config property).

```js
// Project configuration.
grunt.initConfig({
  pkg: grunt.file.readJSON('package.json'),
  oconcat: {
    dist: {
      src: ['src/main.js'],
      dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js',
    },
  },
});
```

## Advanced dynamic filenames

In this more involved example, running `grunt oconcat` will build two separate files (because `oconcat` is a [multi task][multitask]). The destination file paths will be expanded dynamically based on the specified templates, recursively if necessary.

For example, if the `package.json` file contained `{"name": "awesome", "version": "1.0.0"}`, the files `dist/awesome/1.0.0/basic.js` and `dist/awesome/1.0.0/with_extras.js` would be generated.

```js
// Project configuration.
grunt.initConfig({
  pkg: grunt.file.readJSON('package.json'),
  dirs: {
    src: 'src/files',
    dest: 'dist/<%= pkg.name %>/<%= pkg.version %>',
  },
  oconcat: {
    basic: {
      src: ['<%= dirs.src %>/main.js'],
      dest: '<%= dirs.dest %>/basic.js',
    },
    extras: {
      src: ['<%= dirs.src %>/main.js', '<%= dirs.src %>/extras.js'],
      dest: '<%= dirs.dest %>/with_extras.js',
    },
  },
});
```

## Invalid or Missing Files Warning
If you would like the `oconcat` task to warn if a given file is missing or invalid be sure to set `nonull` to `true`:

```js
grunt.initConfig({
  oconcat: {
    missing: {
      src: ['src/invalid_or_missing_file'],
      dest: 'compiled.js',
      nonull: true,
    },
  },
});
```

See [configuring files for a task](http://gruntjs.com/configuring-tasks#files) for how to configure file globbing in Grunt.


## Custom process function
If you would like to do any custom processing before concatenating, use a custom process function:

```js
grunt.initConfig({
  oconcat: {
    dist: {
      options: {
        // Replace all 'use strict' statements in the code with a single one at the top
        banner: "'use strict';\n",
        process: function(src, filepath) {
          return '// Source: ' + filepath + '\n' +
            src.replace(/(^|\n)[ \t]*('use strict'|"use strict");?\s*/g, '$1');
        },
      },
      files: {
        'dist/built.js': ['src/project.js'],
      },
    },
  },
});
```

[multitask]: http://gruntjs.com/creating-tasks#multi-tasks
