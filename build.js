/**
 * MODULES
 */
const StyleDictionary = require("style-dictionary");
const fs = require("fs");
const transformColor = require("./src/utils/transformColor");
const formatTailwind = require("./src/formatters/tailwind");
const formatFigma = require("./src/formatters/figma/index.js");
const mergeFigmaFiles = require("./src/utils/mergeFigmaFiles.js");
const trimHyphens = require("./src/utils/trimHyphens");
const debug = process.argv[2] === "--debug";

/**
 * FILE SYSTEM
 */
const inputDirectory = "tokens/";
const tempDirectory = "temp/";
const outputDirectory = "dist/";
const colorThemes = ["dark"];

const mainTokenGlob = [
  inputDirectory + `brand.!(*.${colorThemes.join(`|*.`)}).js`,
  inputDirectory + `alias.!(*.${colorThemes.join(`|*.`)}).js`,
  inputDirectory + `component.!(*.${colorThemes.join(`|*.`)}).js`,
];

/**
 * THEMES
 * - Gets the names of the color themes from the filesystem
 */

/**
 * TRANSORMS
 */

StyleDictionary.registerTransform({
  name: "color/apply-modify",
  type: "value",
  transitive: true,
  matcher: (token) => token.attributes.category === "color" && token.modify,
  transformer: (token) => {
    return transformColor(token);
  },
});

StyleDictionary.registerTransform(
  Object.assign({}, StyleDictionary.transform[`color/css`], {
    name: "color/css",
    transitive: true,
  })
);

StyleDictionary.registerTransform({
  name: "attribute/tailwind",
  type: "attribute",
  transitive: true,
  matched: (token) => token.attributes.category === "color",
  transformer: (token) => {
    return {
      "tailwind-name": trimHyphens(token.name.replace("color", "")).replace(
        "--",
        "-"
      ),
    };
  },
});

StyleDictionary.registerTransformGroup({
  name: "tailwind",
  transforms: [
    "attribute/cti",
    "name/cti/kebab",
    "size/rem",
    "color/apply-modify",
    "color/css",
  ],
});

StyleDictionary.registerTransformGroup({
  name: "js",
  transforms: [
    "size/rem",
    "name/cti/kebab",
    "attribute/cti",
    "attribute/tailwind",
    "color/apply-modify",
    "color/css",
  ],
});

StyleDictionary.registerTransformGroup({
  name: "figma",
  transforms: [
    "attribute/cti",
    "name/cti/kebab",
    "size/remToPx",
    "color/apply-modify",
    "color/css",
  ],
});

StyleDictionary.registerTransformGroup({
  name: "css",
  transforms: [
    "size/rem",
    "name/cti/kebab",
    "attribute/cti",
    "color/apply-modify",
    "color/css",
  ],
});

/**
 * FORMATS
 */

StyleDictionary.registerFormat({
  name: "tailwind",
  formatter: ({ dictionary, options, file }) =>
    formatTailwind({ dictionary, options, file, debug }),
});

StyleDictionary.registerFormat({
  name: "figma",
  formatter: ({ dictionary, options }) => {
    return formatFigma({ dictionary, options });
  },
});

/**
 * FILTERS
 */

StyleDictionary.registerFilter({
  name: "isBrand",
  matcher: (token) => {
    return token.filePath.indexOf("brand.") > -1;
  },
});

StyleDictionary.registerFilter({
  name: "isColor",
  matcher: (token) => {
    return token.attributes.category === "color";
  },
});

StyleDictionary.registerFilter({
  name: "isAlias",
  matcher: (token) => {
    return token.filePath.indexOf("alias.") > -1;
  },
});

StyleDictionary.registerFilter({
  name: "isAliasNonColor",
  matcher: (token) =>
    token.filePath.indexOf("alias.") > 1 &&
    token.attributes.category !== "color",
});

StyleDictionary.registerFilter({
  name: "isComponent",
  matcher: (token) => {
    return token.filePath.indexOf("component.") > -1;
  },
});

/**
 * MAIN RUN
 * - Style dictionary does a deep merge of everything in input (except for theme files).
 * - This ensures that there are no naming collisions, and that references are respected.
 * -
 * - Each file applies a 'filter' to select which of those tokens it wants to include.
 * - This ensures that each file only contains the final, consumable tokens.
 */

StyleDictionary.extend({
  source: mainTokenGlob,
  platforms: {
    colors: {
      transformGroup: "js",
      buildPath: outputDirectory + "js/",
      files: [
        {
          destination: "colors.js",
          format: "javascript/module",
          filter: "isColor",
        },
      ],
    },
    tokens: {
      transformGroup: "js",
      buildPath: outputDirectory + "js/",
      files: [
        {
          destination: "tokens.js",
          format: "javascript/module",
          filter: "isAliasNonColor",
        },
      ],
    },
    figma: {
      transformGroup: "figma",
      buildPath: tempDirectory + "figma/",
      files: [
        {
          destination: "brand.json",
          format: "figma",
          filter: "isBrand",
        },
        {
          destination: "aliases.json",
          format: "figma",
          filter: "isAlias",
        },
        {
          destination: "components.json",
          format: "figma",
          filter: "isComponent",
        },
      ],
    },
    tailwind: {
      transformGroup: "tailwind",
      buildPath: outputDirectory + "tailwind/",
      files: [
        {
          destination: "tailwind.config.js",
          format: "tailwind",
        },
      ],
    },
    css: {
      transformGroup: "css",
      buildPath: outputDirectory + "css/",
      files: [
        {
          destination: "all.css",
          format: "css/variables",
          filter: (token) => {
            if (!token.filePath.includes("brand")) {
              const { target = "" } = token.attributes;

              return target !== "figma";
            }

            return false;
          },
        },
      ],
    },
  },
}).buildAllPlatforms();

/**
 * COLOR THEMES
 * - style-dictionary will run once for each of the color themes, rather than all at once.
 * - This allows the same token names to be used in each of the output files, which suits the intended
 * - method of use (theme files used as overrides).
 * -
 * - The use of 'include' allows for all the references to be maintained, but a very selective 'source'
 * - and 'filter' on the output files ensures that only the theme tokens are output.
 */
colorThemes.forEach((theme) => {
  StyleDictionary.extend({
    // Include references from all files
    include: mainTokenGlob,
    // Only output from the appropriate color theme file
    source: [inputDirectory + "*." + theme + ".js"],
    platforms: {
      figma: {
        transformGroup: "figma",
        buildPath: tempDirectory + "figma/",
        files: [
          {
            destination: `aliases.${theme}.json`,
            format: "figma",
            options: { theme: theme },
            filter: (token) => {
              return (
                token.filePath.indexOf(theme) > -1 &&
                token.filePath.indexOf("alias.") > -1
              );
            },
          },
          {
            destination: `components.${theme}.json`,
            format: "figma",
            options: { theme: theme },
            filter: (token) => {
              return (
                token.filePath.indexOf(theme) > -1 &&
                token.filePath.indexOf("component.") > -1
              );
            },
          },
        ],
      },
      css: {
        transformGroup: "css",
        buildPath: outputDirectory + "css/",
        files: [
          {
            destination: `theme.${theme}.css`,
            format: "css/variables",
            options: { theme: theme, selector: `.tw-${theme}` },
            filter: (token) => {
              return (
                token.filePath.indexOf(theme) > -1 &&
                token.attributes.category === "color"
              );
            },
          },
        ],
      },
    },
  }).buildAllPlatforms();
});

mergeFigmaFiles();
