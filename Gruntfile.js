module.exports = function(grunt) {
  var rConfig = require('./src/js/config');

  rConfig.baseUrl = './src/js/';
  rConfig.out = 'src/build/js/main.js';
  rConfig.name = 'main';
  rConfig.optimize = 'none';
  rConfig.done = function(done, output) {
    var duplicates = require('rjs-build-analysis').duplicates(output);

    if (duplicates.length > 0) {
      grunt.log.subhead('Duplicates found in requirejs build:');
      grunt.log.warn(duplicates);
      done(new Error('r.js built duplicate modules, please check the excludes option.'));
    }

    done();
  };


  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    requirejs: {
      compile: {
        options: rConfig
      }
    },

    csslint: {
      options: {
        'box-sizing': false
      }
    },

    compass: {
        production: {
            options: {
                sassDir: 'src/scss',
                cssDir: 'src/build/css',
                imagesDir: 'src/img',
                environment: 'production'
            }
        }
    },

    jshint: {
      all: ['src/js/**/*.js'],
      options: {
        bitwise: true,
        browser: true,
        curly: true,
        eqeqeq: true,
        immed: true,
        jquery: true,
        latedef: true,
        newcap: true,
        noarg: true,
        node: true,
        nonew: true,
        plusplus: true,
        sub:true,
        loopfunc: true,
        regexp: true,
        trailing: true,
        undef: true,
        globals: {
          define: true
        }
      }
    },

    devserver: {
      options: {
        'type': 'http',
        'port': 8888,
        'base': 'src',
        'cache': 'no-cache',
        'async': true
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-devserver');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-compass');

  // Default task(s).
  grunt.registerTask('default', ['jshint', 'compass:production', 'requirejs']);
};
