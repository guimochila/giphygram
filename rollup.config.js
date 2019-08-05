import replace from 'rollup-plugin-replace';
import {terser} from 'rollup-plugin-terser';
import rimraf from 'rimraf';

const {version} = require('./package.json');

rimraf.sync('public/build');
rimraf.sync('public/sw.js');

export default [
  {
    input: ['src/main.js'],
    output: {
      format: 'iife',
      dir: 'public/build',
    },
    plugins: [terser()],
  },
  {
    input: ['src/sw.js'],
    output: {
      format: 'iife',
      dir: 'public/',
    },
    plugins: [
      replace({
        delimiters: ['{{', '}}'],
        version,
      }),
      terser(),
    ],
  },
];
