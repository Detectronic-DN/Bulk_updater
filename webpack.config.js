const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { content } = require('./tailwind.config');

module.exports = {
    entry: './src/static/js/index.tsx',
    output: {
        path: path.resolve(__dirname, 'src/static/dist'),
        filename: 'bundle.js',
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
        alias: {
            '@': path.resolve(__dirname, 'src/static/js'),
        },
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader', 'postcss-loader'],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/templates/index.html',
        }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'src/static'),
        },
        historyApiFallback: true,
        port: 3250,
        proxy: [
            {
                context: '/api',
                target: 'http://localhost:8230',
            },
        ],
    },
};