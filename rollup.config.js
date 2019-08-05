import multiInput from 'rollup-plugin-multi-input';
import replace from 'rollup-plugin-replace';
import {uglify} from 'rollup-plugin-uglify';
import rimraf from 'rimraf';

const {version} = require('./package.json');

rimraf.sync('public/build');

export default {
  input: ['src/main.js'],
  output: {
    format: 'iife',
    dir: 'public/build',
  },
  plugins: [
    replace({
      delimiters: ['{{', '}}'],
      version,
    }),
    multiInput(),
    uglify(),
  ],
};
