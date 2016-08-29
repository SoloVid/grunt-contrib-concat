/*
* grunt-ordered-concat
* http://gruntjs.com/
*
* Copyright (c) 2016 SoloVid, contributors
* Licensed under the MIT license.
*/

'use strict';

module.exports = function(grunt) {

  // Internal lib.
  var comment = require('./lib/comment').init(grunt);
  var chalk = require('chalk');
  var sourcemap = require('./lib/sourcemap').init(grunt);
  var path = require('path');

  grunt.registerMultiTask('oconcat', 'Concatenate files allowing dependent order.', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      separator: grunt.util.linefeed,
      banner: '',
      footer: '',
      stripBanners: false,
      process: false,
      sourceMap: false,
      sourceMapName: undefined,
      sourceMapStyle: 'embed',
      root: '.'
    });

    // Normalize boolean options that accept options objects.
    if (options.stripBanners === true) {
      options.stripBanners = {};
    }
    if (options.process === true) {
      options.process = {};
    }

    // Process banner and footer.
    var banner = grunt.template.process(options.banner);
    var footer = grunt.template.process(options.footer);

    // Set a local variable for whether to build source maps or not.
    var sourceMap = options.sourceMap;

    // If content is not embedded and it will be modified, either exit or do
    // not make the source map.
    if (
      sourceMap && options.sourceMapStyle === 'link' &&
      (options.stripBanners || options.process)
    ) {
      // Warn and exit if --force isn't set.
      grunt.warn(
        'stripBanners or process option is enabled. ' +
        'Set sourceMapStyle option to \'embed\' or \'inline\'.'
      );
      // --force is set, continue on without the source map.
      grunt.log.warn('Skipping creation of source maps.');
      // Set sourceMap to false to keep maps from being constructed.
      sourceMap = false;
    }

    // Iterate over all src-dest file pairs.
    this.files.forEach(function(f) {
      // Initialize source map objects.
      var sourceMapHelper;
      if (sourceMap) {
        sourceMapHelper = sourcemap.helper(f, options);
        sourceMapHelper.add(banner);
      }

      function getPath(myPath, inFilePath) {
        if(inFilePath.startsWith("/")) {
          return path.join(options.root, inFilePath.slice(1));
        }
        else {
          return path.join(path.dirname(myPath), inFilePath);
        }
      }

      function concatInOrder(map) {
        var output = "";
        var concatted = {};
        var dependencies = {};
        var dependents = {};
        var filepath;

        function checkDependencies(filepath) {
          dependencies[filepath] = dependencies[filepath] || [];
          var src = map[filepath];
          var hasUnconcattedDependencies = false;
          map[filepath] = src.replace(/dependsOn\("((?:[^"\\]|\\.)*)"\);?(?:\r?\n)?/g, function(match, p1) {
            var depPath = getPath(filepath, p1);
            if(!concatted[p1] && filepath !== depPath) {
              dependencies[filepath].push(depPath);
              dependents[depPath] = dependents[depPath] || [];
              dependents[depPath].push(filepath);
              hasUnconcattedDependencies = true;
            }
            return "";
          });
          return !hasUnconcattedDependencies;
        }

        function resolveDependents(filepath) {
          function doesntEqualFilepath(val) {
            return val !== filepath;
          }

          output += map[filepath] + options.separator;
          concatted[filepath] = true;
          var myDependents = dependents[filepath] || [];
          while(myDependents.length > 0) {
            var dependent = myDependents.pop();
            dependencies[dependent] = (dependencies[dependent] || []).filter(doesntEqualFilepath);
            if(dependencies[dependent].length === 0) {
              resolveDependents(dependent);
            }
          }
        }

        for(filepath in map) {
          if(checkDependencies(filepath)) {
            resolveDependents(filepath);
          }
        }
        for(filepath in dependencies) {
          var unhandledDeps = dependencies[filepath];
          for(var i = 0; i < unhandledDeps.length; i++) {
            var unhandledDep = unhandledDeps[i];
            if (!grunt.file.exists(unhandledDep)) {
              grunt.log.warn('Dependency "' + chalk.yellow(unhandledDep) + '" (referenced by ' + chalk.cyan(filepath) + ') not found.');
            }
            else if (!(unhandledDep in map)) {
              grunt.log.warn('Dependency "' + chalk.yellow(unhandledDep) + '" (referenced by ' + chalk.cyan(filepath) + ') not in glob of configured files. (Add it to Gruntfile.js.)');
            }
            else {
              grunt.log.warn('Circular dependencies including "' + chalk.yellow(unhandledDep) + '" (referenced by ' + chalk.cyan(filepath) + ').');
            }
          }
          if(unhandledDeps.length > 0) {
            grunt.log.warn('Source file "' + chalk.yellow(filepath) + '" ignored.');
          }
        }

        output = output.slice(0, -options.separator.length);

        return output;
      }

      var fileContentsMap = {};

      f.src.filter(function(filepath) {
        // Warn on and remove invalid source files (if nonull was set).
        if (!grunt.file.exists(filepath)) {
          grunt.log.warn('Source file "' + filepath + '" not found.');
          return false;
        }
        return true;
      }).forEach(function(filepath, i) {
        if (grunt.file.isDir(filepath)) {
          return;
        }
        // Read file source.
        var src = grunt.file.read(filepath);
        // Process files as templates if requested.
        if (typeof options.process === 'function') {
          src = options.process(src, filepath);
        } else if (options.process) {
          src = grunt.template.process(src, options.process);
        }
        // Strip banners if requested.
        if (options.stripBanners) {
          src = comment.stripBanner(src, options.stripBanners);
        }
        // Add the lines of this file to our map.
        if (sourceMapHelper) {
          src = sourceMapHelper.addlines(src, filepath);
          if (i < f.src.length - 1) {
            sourceMapHelper.add(options.separator);
          }
        }
        fileContentsMap[path.join(filepath)] = src;
        //return src;
      });

      // Concat banner + specified files + footer.
      var src = banner + concatInOrder(fileContentsMap)/*.join(options.separator)*/ + footer;

      if (sourceMapHelper) {
        sourceMapHelper.add(footer);
        sourceMapHelper.write();
        // Add sourceMappingURL to the end.
        src += sourceMapHelper.url();
      }

      // Write the destination file.
      grunt.file.write(f.dest, src);

      // Print a success message.
      grunt.verbose.write('File ' + chalk.cyan(f.dest) + ' created.');
    });
  });

};
