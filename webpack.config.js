const webpack = require("webpack");
const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    entry: {
        CKEditorForMendix: "./src/CKEditorForMendix/widget/CKEditorForMendix.js",
        CKEditorViewerForMendix: "./src/CKEditorForMendix/widget/CKEditorViewerForMendix.js",
    },
    resolve: {
        extensions: [ ".js" ]
    },
    output: {
        path: path.resolve(__dirname, "dist/tmp/src"),
        filename: "CKEditorForMendix/widget/[name].js",
        libraryTarget: "amd"
    },
    devtool: "source-map",
    externals: [ /^mxui\/|^mendix\/|^dojo\/|^dijit\// ],
    plugins: [
        new CopyWebpackPlugin([
            { from: "src/**/*.xml", to: "../" },
            { from: "src/**/*.html", to: "../" },
            { from: "src/**/*.css", to: "../" },
            { from: "src/CKEditorForMendix/widget/lib/**/*", to: "../" },
            { from: "src/**/preview.jpg", to: "../" },
        ], { copyUnmodified: true }),
        new webpack.LoaderOptionsPlugin({ debug: true }),
    ]
};
