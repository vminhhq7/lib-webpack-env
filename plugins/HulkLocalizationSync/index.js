const path = require("path");
const fs = require("fs");
const { get, set, difference, merge } = require('lodash')
const axios = require("axios");
const { stringify } = require("querystring");

const pluginName = "RequestLocalizationSync";

const flattenObject = (ob) => {
    var toReturn = {};
    for (var i in ob) {
        if (!ob.hasOwnProperty(i)) continue;
        if ((typeof ob[i]) == 'object' && ob[i] !== null && !Array.isArray(ob[i])) {
            var flatObject = flattenObject(ob[i]);
            for (var x in flatObject) {
                if (!flatObject.hasOwnProperty(x)) continue;
                toReturn[i + '.' + x] = flatObject[x];
            }
        } else {
            toReturn[i] = ob[i];
        }
    }
    return toReturn;
}

const parseKeyToObject = (keys = [], object = {}) => {
    return keys.reduce((result, key) => {
        set(result, key, get(object, key))
        return result
    }, {})
}

const requestBodyParser = (localeDatas, options = {}) => ({
    ...options,
    data: localeDatas
})

const isDisabled = (compilerOptions) => {
    return compilerOptions.mode !== 'production'
}

module.exports = class RequestLocalizationSync {

    static defaultOptions = {
        filename: null, // "translations.json",
        authApplicationCode: process.env.AUTH_APPLICATION_CODE,
        applicationName: process.env.APPLICATION_NAME,
        defaultNameSpace: 'common',
        localResources: {},
        languages: ['en'],
        requestOptions: {
            url: process.env.LOCALIZATION_SYNC_URL,
            method: 'POST',
            headers: { 'Content-Type': 'application/json-patch+json', 'Accept': 'application/json' },
            bodyParser: requestBodyParser
        },
        isDisabled,
    };

    constructor(options = {}) {
        this.options = { ...RequestLocalizationSync.defaultOptions, ...options };
        this.matchKeys = [];
    }

    apply(compiler) {
        let isBypassed = false;
        if (typeof this.options.isDisabled === 'boolean') {
            isBypassed = this.options.isDisabled
        } else if (typeof this.options.isDisabled === 'function') {
            isBypassed = this.options.isDisabled(compiler.options)
        }
        if (isBypassed) return

        compiler.hooks.done.tapAsync(pluginName, async (stats, callback) => {
            const sendRequest = async (data, applicationName, languageCode = 'en', isFullUpdate = true) => {
                try {
                    const applicationCode = this.options.authApplicationCode || process.env.AUTH_APPLICATION_CODE
                    const portalCode = applicationName || this.options.applicationName || process.env.APPLICATION_NAME
                    const dataOptions = {
                        requestInfo: { languageCode },
                        applicationCode, portalCode, isFullUpdate,
                    };
                    const requestOptions = Object.assign(this.options.requestOptions, {
                        url: process.env.LOCALIZATION_SYNC_URL || this.options.requestOptions.url,
                        data: (this.options.requestOptions.bodyParser || requestBodyParser)(data, dataOptions),
                    });
                    console.log("=====> ", { pluginName, url: requestOptions.url });
                    const resp = await axios(requestOptions,);
                    const version = get(resp, 'data.responseInfo.version') || 'unknown'
                    if (get(resp, 'data.data')) {
                        console.log(`${pluginName} Translations import success | Application Name: "${portalCode}" | Lang: "${languageCode}"\n - Version ${version}`)
                    } else {
                        console.log(`Cannot sync Translations: ${JSON.stringify(get(resp, 'data.errors') || get(resp, 'data'))}\nVersion ${version}`);
                    }
                } catch (error) {
                    console.log('ERROR', pluginName, error.response || error)
                }
            }

            const applicationName = this.options.applicationName || process.env.APPLICATION_NAME
            const isSkipExtract = !this.options.filename;
            const outputPath = !isSkipExtract && path.join(compiler.outputPath, this.options.filename)
            const localResources = this.options.localResources;

            let resources = {}
            if (!isSkipExtract) {
                try {
                    resources = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
                } catch (error) {
                    console.log('ERROR', pluginName, error)
                }
            }

            const isHasCommon = !!Object.keys(resources).length

            for (let languageCode of this.options.languages) {
                const localResource = localResources[languageCode];
                if (localResource) {
                    const localResourceKeys = flattenObject(localResource)

                    const data = merge(resources, localResource);
                    const resourceKeys = Object.keys(flattenObject(data))
                    const commonKeys = difference(resourceKeys, Object.keys(localResourceKeys))

                    const commonData = parseKeyToObject(commonKeys, data)

                    const runPromises = [sendRequest(localResource, applicationName, languageCode, true)]
                    if (isHasCommon && applicationName !== this.options.defaultNameSpace) {
                        runPromises.push(sendRequest(commonData, this.options.defaultNameSpace, languageCode, false))
                    }
                    await Promise.all(runPromises)
                }
            }
            callback();
        })
    }
};