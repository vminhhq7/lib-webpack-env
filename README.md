# request-env-webpack

[Webpack](http://webpack.github.io/) (v1-5) plugin that allow you to request environment variables from an url by using [axios](https://github.com/axios/axios) requests
before build (or after, or any other [event hook](https://webpack.js.org/api/compiler-hooks/)). 
Can stop compilation by condition.

## Installation

```
npm install --save-dev request-env-webpack
```

## Usage

In config file:

``` javascript
const RequestEnvPlugin = require('request-env-webpack');
// ...
  module: {
    plugins: [
      new RequestEnvPlugin({
        // Axios options...
        url: 'http://some.url/to/get/your/env.json', // priority load from url first
        configPath: '/home/user1/config.json', // config file to read, default get from env CONFIG_PATH (optional) { data: { 'APP_DATA': 'value' } }, load default from process.env.CONFIG_PATH
        method: 'get',
        configParser: (configs) => config.data, // the return value will be set to process.env
      }), // response: ( data: { data: [{ key: 'APP_DATA', value: 'test' }], error: [] } )
    ]
  },
// ...
```
In js file:

``` javascript
// src/index.js
// ...
  console.log(process.env.APP_DATA) // output: "test"
// ...
```

Read from json file:

``` javascript
const RequestEnvPlugin = require('request-env-webpack');
// ...
  module: {
    plugins: [
      new RequestEnvPlugin({
        configPath: '/home/user1/config.json', // config file to read, default get from env CONFIG_PATH (optional)
        configParser: (configs) => configs.data,
      }), // response: ( data: { data: [{ key: 'APP_DATA', value: 'test' }], error: [] } )
    ]
  },
// ...
```

In json file:

``` javascript
// /home/user1/config.json
  {
    "data": {
        "KEY1": "this-is-value-01",
        "KEY2": "this-is-value-02",
    },
    "metadata": {}
}
```

In js file:

``` javascript
// src/index.js
// ...
  console.log(process.env.KEY1) // output: "this-is-value-01"
// ...
```


You can find other axios's API options [here](https://github.com/axios/axios#axios-api)

By default, environment variables will load from .env files, more informations [here](https://github.com/motdotla/dotenv#readme)

