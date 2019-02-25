import { readFileSync } from "fs";
import { resolve } from "path";
import { isObject } from "lodash";

import { GeneratorOptions } from "./bootstrap/options";
import { Swagger } from "./bootstrap/swagger";
import { ENCODING } from "./lib/utils";
import { generateModelTSFiles } from "./lib/model-generator";
import {
  generateEnumTSFile,
  generateEnumI18NHtmlFile,
  generateEnumLanguageFiles
} from "./lib/enum-generator";
import * as request from 'request';
import * as rp from 'request-promise';

const TEMPLATE_FOLDER = resolve(__dirname, "templates");

/**
* Generate TypeScript files based on the given SwaggerFile and some templates
*
* @param {string} swaggerInput The fileName of the swagger.json file including path
* @param {object} options Options which are used during generation
*                 .modelFolder: the name of the folder (path) to generate the models in.
                                each model class is generated in its own file.
*                 .enumTSFile: the name of the enum TS file including path
*                 .enumI18NHtmlFile: the name of the HTML file including path to generate enum values for translation.
*                 .enumLanguageFiles: array with the names of the enum languages file including path
*                 .modelModuleName: the name of the model module (aka namespace)
*                 .enumModuleName: the name of the enum module (aka namespace)
*/
export async function generateTSFiles(
  swaggerInput: string | Swagger,
  options: GeneratorOptions
) {
  options = enrichConfig(options);

  if (!swaggerInput) {
    throw "swaggerFileName must be defined";
  }
  if (!isObject(options)) {
    throw "options must be defined";
  }

  let swagger;
  if (typeof swaggerInput === "string") {
    if (swaggerInput.startsWith('http://') || swaggerInput.startsWith('https://')) {
      const rpOption = {
        method: 'GET',
        uri: swaggerInput,
        strictSSL:false,
        json: true // Automatically stringifies the body to JSON
      };
      // rp(rpOption).then(function (parsedBody) {
      //   console.log(parsedBody);
      // })
      //   .catch(function (err) {
      //     // POST failed...
      //     console.log(err);
      //   });
      swagger = await rp(rpOption);
      // console.log(swagger);
    } else {
      swagger = JSON.parse(readFileSync(swaggerInput, ENCODING).trim()) as Swagger;
    }
  } else {
    swagger = swaggerInput;
  }


  if (typeof swagger !== "object") {
    throw new TypeError("The given swagger input is not of type object");
  }

  // let folder = path.normalize(options.modelFolder);
  // utils.removeFolder(folder);

  generateModelTSFiles(swagger, options);
  generateEnumTSFile(swagger, options);
  if (options.enumI18NHtmlFile) {
    generateEnumI18NHtmlFile(swagger, options);
  }
  if (options.enumLanguageFiles) {
    generateEnumLanguageFiles(swagger, options);
  }
}

function enrichConfig(options: GeneratorOptions) {
  const templates = options.templates;
  delete options.templates;
  return {
    generateBarrelFiles: true,
    generateClasses: true,
    generateValidatorFile: true,
    baseModelFileName: "base-model.ts",
    validatorsFileName: "validators.ts",
    subTypeFactoryFileName: "sub-type-factory.ts",
    subTypePropertyName: options.subTypePropertyName || "$type",
    templates: {
      validators: `${TEMPLATE_FOLDER}/generate-validators-ts.hbs`,
      baseModel: `${TEMPLATE_FOLDER}/generate-base-model-ts.hbs`,
      models: `${TEMPLATE_FOLDER}/generate-model-ts.hbs`,
      subTypeFactory: `${TEMPLATE_FOLDER}/generate-sub-type-factory-ts.hbs`,
      barrel: `${TEMPLATE_FOLDER}/generate-barrel-ts.hbs`,
      enum: `${TEMPLATE_FOLDER}/generate-enum-ts.hbs`,
      enumLanguage: `${TEMPLATE_FOLDER}/generate-enum-i18n-html.hbs`,
      ...templates
    },
    ...options
  } as GeneratorOptions;
}
