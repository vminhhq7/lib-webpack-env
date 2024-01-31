const path = require("path");
const SystemJSPublicPathPlugin = require("systemjs-webpack-interop/SystemJSPublicPathWebpackPlugin");
const systemjsInterop = require("systemjs-webpack-interop/webpack-config");

module.exports = {
  overrideWebpackConfig: ({
    webpackConfig,
    pluginOptions: {
      orgName,
      projectName,
      entry,
      outputPath,
      orgPackagesAsExternal,
      reactPackagesAsExternal,
      externals: userExternals = [],
      minimize = false,
      useHash = true,
      versionName = null,
    },
    context: { env },
  }) => {
    if (typeof orgName !== "string") {
      throw Error(
        `craco-plugin-single-spa-application requires an orgName string`
      );
    }

    if (typeof projectName !== "string") {
      throw Error(
        `craco-plugin-single-spa-application requires an opts.projectName string`
      );
    }
    const isDev = env === 'development';
    const filename = `${orgName}-${projectName}`
    webpackConfig.entry = path.resolve(entry || "src/index.js");
    webpackConfig.output.filename = `${filename}${!isDev && versionName ? `.${versionName}` : ''}${!isDev && useHash ? '.[hash]' : ''}.js`;
    webpackConfig.output.libraryTarget = "system";
    webpackConfig.output.devtoolNamespace = projectName;
    webpackConfig.output.publicPath = "";
    webpackConfig.output.jsonpFunction = `wpJsonp_${orgName}_${projectName}`
    webpackConfig.output.chunkFilename = `[name].chunk.${filename}${!isDev && versionName ? versionName : ''}${!isDev && useHash ? '.[chunkhash]' : ''}.js`;
    webpackConfig.optimization.minimize = minimize;
    webpackConfig.optimization.namedModules = true;
    webpackConfig.optimization.namedChunks = true;
    webpackConfig.optimization.sideEffects = false;

    webpackConfig.optimization.splitChunks = {
      // minChunks: 2,
      chunks: "async",
      cacheGroups: { default: false },
    };

    delete webpackConfig.optimization.runtimeChunk;

    webpackConfig.module.rules.push({ parser: { system: false } });

    let externals = ["single-spa", ...userExternals];

    if (reactPackagesAsExternal !== false)
      externals = [...externals, "react", "react-dom"];

    if (orgPackagesAsExternal === true)
      externals = [...externals, new RegExp(`^@${orgName}/`)];

    webpackConfig.externals = externals;

    disableCSSExtraction(webpackConfig);

    systemjsInterop.checkWebpackConfig(webpackConfig);

    return webpackConfig;
  },

  overrideCracoConfig: ({
    cracoConfig,
    pluginOptions: { orgName, projectName, rootDirectoryLevel },
  }) => {
    if (!cracoConfig.webpack) cracoConfig.webpack = {};
    if (!cracoConfig.webpack.plugins) cracoConfig.webpack.plugins = {};
    if (!cracoConfig.webpack.plugins.remove)
      cracoConfig.webpack.plugins.remove = [];

    cracoConfig.webpack.plugins.remove.push("HtmlWebpackPlugin");
    cracoConfig.webpack.plugins.remove.push("MiniCssExtractPlugin");

    cracoConfig.webpack.plugins.add = [
      ...(cracoConfig.webpack.plugins.add || []),
      new SystemJSPublicPathPlugin({
        systemjsModuleName: `@${orgName}/${projectName}`,
        rootDirectoryLevel: rootDirectoryLevel,
      }),
    ];

    const filename = `${orgName}-${projectName}`
    cracoConfig.devServer = cracoConfig.devServer || {};
    cracoConfig.devServer.filename = `${filename}.js`;
    cracoConfig.devServer.historyApiFallback = true;
    cracoConfig.devServer.compress = true;
    cracoConfig.devServer.hot = true;
    cracoConfig.devServer.liveReload = true;
    cracoConfig.devServer.host = "localhost";

    // cracoConfig.devServer.writeToDisk = true;

    cracoConfig.devServer.open = false;
    // cracoConfig.devServer.publicPath = path.join(__dirname, '/');
    cracoConfig.devServer.contentBase = path.join(__dirname, 'public');

    return cracoConfig;
  },

  overrideDevServerConfig: ({ devServerConfig, cracoConfig, pluginOptions, context: { env, paths, proxy, allowedHost } }) => {
    devServerConfig.filename = cracoConfig.devServer.filename
    devServerConfig.historyApiFallback = true;
    devServerConfig.compress = true;
    devServerConfig.host = "localhost";
    devServerConfig.open = false;
    devServerConfig.hot = true;
    devServerConfig.liveReload = true;
    // devServerConfig.writeToDisk = true;

    devServerConfig.headers = Object.assign(devServerConfig.headers || {}, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    })
    return devServerConfig;
  },
};

const disableCSSExtraction = (webpackConfig) => {
  webpackConfig.module.rules[1].oneOf.forEach((x) => {
    if (!x.use) return;

    if (Array.isArray(x.use)) {
      x.use.forEach((use) => {
        if (use.loader && use.loader.includes("mini-css-extract-plugin")) {
          use.loader = require.resolve("style-loader/dist/cjs.js");
          delete use.options;
        }
      });
    }
  });
};
