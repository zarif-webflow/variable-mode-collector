import { defineConfig } from 'rollup';
import cjsPlugin from '@rollup/plugin-commonjs';
import reslovePlugin from '@rollup/plugin-node-resolve';
import replacePlugin from '@rollup/plugin-replace';
import tsPlugin from '@rollup/plugin-typescript';
import esbuildPlugin from 'rollup-plugin-esbuild';
import livereloadPlugin from 'rollup-plugin-livereload';
import servePlugin from 'rollup-plugin-serve';
import css from 'rollup-plugin-import-css';

export default defineConfig({
  input: {},
  output: {
    format: 'module',
    dir: 'dist',
    manualChunks: {},
    chunkFileNames(chunkInfo) {
      return `chunks/${chunkInfo.name}.js`;
    },
  },
  plugins: [
    css({ minify: true }),
    replacePlugin({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    cjsPlugin(),
    tsPlugin(),
    reslovePlugin(),
    esbuildPlugin({ minify: true, target: 'es2020', platform: 'browser' }),
    servePlugin({
      contentBase: 'dist',
      port: 3000,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    }),
    livereloadPlugin({ watch: 'dist', inject: false, verbose: true }),
  ],
});
