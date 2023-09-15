const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        'popup/popup': path.resolve(__dirname, 'src', 'popup', 'popup.js'),
        'content_scripts/export-ics': path.resolve(__dirname, 'src', 'content_scripts', 'export-ics.js'),
    },
    devtool : 'inline-source-map',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: 'src/popup/popup.html', to: 'popup/popup.html' },
                { from: 'src/assets/logo.png', to: 'assets/logo.png' },
                { from: 'src/popup/popup.css', to: 'popup/popup.css' },
                { from: 'src/manifest.json', to: 'manifest.json' },
                { from: 'src/page/selector.css', to: 'page/selector.css' },
                { from: 'src/popup/autocomplete.css', to: 'popup/autocomplete.css' },
                {
                    from: 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js', 
                    to: 'webextension-polyfill/browser-polyfill.js',  
                }
            ]
        })
    ]
};
