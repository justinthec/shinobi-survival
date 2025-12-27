const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    entry: {
        game: './src/client.ts',
        profiler: './src/profiler.ts',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        allowTsInNodeModules: true,
                        ignoreDiagnostics: [2769]
                    }
                },
                exclude: /node_modules\/(?!netplayjs|@vramesh)/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: "local-testing.html", to: "." },
                { from: "game.html", to: "." },
                { from: "profiler.html", to: "." },
                { from: "grass.png", to: "." },
                { from: "assets", to: "assets" },
            ],
        }),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        compress: true,
        port: 9000,
    },
};
