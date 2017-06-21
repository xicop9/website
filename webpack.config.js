const path = require('path');
const webpack = require('webpack');

module.exports = {
    entry: ['./ts/index.tsx'],
    output: {
        path: path.join(__dirname, '/public'),
        filename: 'bundle.js',
    },
    devtool: 'source-map',
    resolve: {
        modules: [
            path.join(__dirname, '/ts'),
            'node_modules',
        ],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.md'],
        alias: {
            ts: path.join(__dirname, '/ts'),
            less: path.join(__dirname, '/less'),
            md: path.join(__dirname, '/md'),
            json: path.join(__dirname, '/json'),
        },
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                loader: 'source-map-loader',
            },
            {
                test: /\.tsx?$/,
                loader: 'awesome-typescript-loader',
            },
            {
                test: /\.md$/,
                use: 'raw-loader',
            },
            {
                test: /\.less$/,
                loader: 'style-loader!css-loader!less-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                loaders: ['style-loader', 'css-loader'],
            },
            {
                test: /\.json$/,
                loader: 'json-loader',
            },
        ],
    },
    devServer: {
        port: 3572,
        historyApiFallback: {
          index: 'index.html',
      },
      disableHostCheck: true,
    },
    plugins: [
        // Since we do not use moment's locale feature, we exclude them from the bundle.
        // This reduces the bundle size by 0.4MB.
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    ],
};
