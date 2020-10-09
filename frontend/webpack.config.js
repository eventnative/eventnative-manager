const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin')
const HtmlWebPackPlugin = require("html-webpack-plugin");
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
    },
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin({
            terserOptions: {
                keep_classnames: true
            }
        })]
    },
    module: {
        rules: [
            {
                test: /\.less$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'style-loader', // creates style nodes from JS strings
                    },
                    {
                        loader: 'css-loader', // translates CSS into CommonJS
                        options: {
                            url: false,
                            import: false,
                        }
                    },
                    {
                        loader: 'less-loader',
                        options: {
                            webpackImporter: true,
                            lessOptions: {javascriptEnabled: true}
                        }
                    }]

            },
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader"
                }
            },
            {
                test: /\.(ts|tsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: "ts-loader"
                }
            },
            {
                test: /\.(png|jpe?g|gif|svg)$/i,
                use: [
                    {
                        loader: 'file-loader',
                    },
                ],
            },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
        ],
    }, plugins: [
        new HtmlWebPackPlugin({
            template: "./src/index.html",
            filename: "./index.html"
        }),
        new FaviconsWebpackPlugin({
            logo: './src/icons/logo.svg',
            publicPath: '.'
        }),
        new webpack.DefinePlugin({
            'process.env': {
                BACKEND_API_BASE: JSON.stringify(process.env.BACKEND_API_BASE),
                APP_ENV: JSON.stringify(process.env.ENV)
            },
        }),
        new CopyPlugin({
            patterns: [
                { from: 'src/boot', to: "boot" }
            ]
        })
    ]
};