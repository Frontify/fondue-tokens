/**
 * MODULES
 */
const StyleDictionary = require("style-dictionary");
const fs = require("fs");
const getTailwindConfig = require("./scripts/getTailwindConfig");
const transformColor = require("./scripts/transformColor");
const getFigmaJson = require("./scripts/getFigmaJson");

/**
 * FILE SYSTEM
 */
const inputDirectory = "tokens/";
const tempDirectory = "temp/";
const outputDirectory = "dist/";
const tokenFiles = fs.readdirSync(inputDirectory);

const brandColorsPath = inputDirectory + "brand.colors.js";
const brandTypographyPath = inputDirectory + "brand.typography.js";
const uiColorsPath = inputDirectory + "ui.colors.js";
const uiElementsPath = inputDirectory + "ui.elements.js";
const uiSizingPath = inputDirectory + "ui.sizing.js";
const uiTypographyPath = inputDirectory + "ui.typography.js";
const uiThemesGlob = inputDirectory + "ui.theme.*.js";

const brandFilePaths = [brandColorsPath, brandTypographyPath];

const uiFilePaths = [
  uiColorsPath,
  uiElementsPath,
  uiSizingPath,
  uiTypographyPath,
];

/**
 * THEMES
 * - Gets the names of the color themes from the filesystem
 */
const colorThemes = tokenFiles
  .filter((file) => file.indexOf(".theme.") > -1)
  .map((file) => {
    return file.replace("ui.theme.", "").replace(".js", "");
  });

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

StyleDictionary.registerTransformGroup({
  name: "tailwind",
  transforms: [
    "attribute/cti",
    "name/cti/kebab",
    "size/px",
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

/**
 * FORMATS
 */

StyleDictionary.registerFormat({
  name: "tailwind",
  formatter: ({ dictionary, options, file }) => {
    return getTailwindConfig({ dictionary, options, file });
  },
});

StyleDictionary.registerFormat({
  name: "figma",
  formatter: ({ dictionary }) => {
    return getFigmaJson({ dictionary });
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
  source: [...brandFilePaths, ...uiFilePaths],
  platforms: {
    figma: {
      transformGroup: "figma",
      buildPath: tempDirectory + "figma/",
      files: [
        {
          destination: "default.json",
          format: "figma",
          filter: (token) => {
            return uiFilePaths.includes(token.filePath);
          },
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
          filter: (token) => {
            return uiFilePaths.includes(token.filePath);
          },
        },
      ],
    },
    css: {
      transformGroup: "css",
      buildPath: outputDirectory + "css/",
      files: [
        {
          destination: "colors.css",
          format: "css/variables",
          filter: (token) => {
            return token.filePath === uiColorsPath;
          },
        },
        {
          destination: "typography.css",
          format: "css/variables",
          filter: (token) => {
            return token.filePath === uiTypographyPath;
          },
        },
        {
          destination: "sizes.css",
          format: "css/variables",
          filter: (token) => {
            return token.filePath === uiSizingPath;
          },
        },
        {
          destination: "elements.css",
          format: "css/variables",
          filter: (token) => {
            return token.filePath === uiElementsPath;
          },
        },
      ],
    },
  },
}).buildAllPlatforms();
// StyleDictionary.extend({
//   source: [...brandFilePaths, ...uiFilePaths],
//   transformGroup: {
//     tailwind: [
//       "attribute/cti",
//       "name/cti/kebab",
//       "size/px",
//       "colorTransform",
//       "color/css",
//     ],
//     css: ["attribute/cti", "name/cti/kebab", "colorTransform", "color/css"],
//     figmaJson: [
//       "attribute/cti",
//       "name/cti/kebab",
//       "size/remToPx",
//       "colorTransform",
//       "color/css",
//     ],
//   },
//   transform: {
//     // Standard color value transformation
//     colorTransform: {
//       type: "value",
//       transitive: true,
//       matcher: (token) => token.attributes.category === "color" && token.modify,
//       transformer: transformColor,
//     },
//     // Make the standard color/css transitive
//     "color/css": Object.assign({}, StyleDictionary.transform[`color/css`], {
//       transitive: true,
//     }),
//   },
//   format: {
//     tailwind: ({ dictionary, options, file }) => {
//       return getTailwindConfig({ dictionary, options, file });
//     },
//     figmaJson: ({ dictionary }) => {
//       return getFigma({ dictionary });
//     },
//   },
//   platforms: {
//     figma: {
//       transformGroup: "figmaJson",
//       buildPath: tempDirectory + "figma/",
//       files: [
//         {
//           destination: "default.json",
//           format: "figmaJson",
//           filter: (token) => {
//             return uiFilePaths.includes(token.filePath);
//           },
//         },
//       ],
//     },
//     tailwind: {
//       transformGroup: "tailwind",
//       buildPath: outputDirectory + "tailwind/",
//       files: [
//         {
//           destination: "tailwind.config.js",
//           format: "tailwind",
//           filter: (token) => {
//             return uiFilePaths.includes(token.filePath);
//           },
//         },
//       ],
//     },
//     css: {
//       transformGroup: "css",
//       buildPath: outputDirectory + "css/",
//       files: [
//         {
//           destination: "colors.css",
//           format: "css/variables",
//           filter: (token) => {
//             return token.filePath === uiColorsPath;
//           },
//         },
//         {
//           destination: "typography.css",
//           format: "css/variables",
//           filter: (token) => {
//             return token.filePath === uiTypographyPath;
//           },
//         },
//         {
//           destination: "sizes.css",
//           format: "css/variables",
//           filter: (token) => {
//             return token.filePath === uiSizingPath;
//           },
//         },
//         {
//           destination: "elements.css",
//           format: "css/variables",
//           filter: (token) => {
//             return token.filePath === uiElementsPath;
//           },
//         },
//       ],
//     },
//   },
// }).buildAllPlatforms();

/**
 * COLOR THEMES
 * - style-dictionary will run once for each of the color themes, rather than all at once.
 * - This allows the same token names to be used in each of the output files, which suits the intended
 * - method of use (theme files used as overrides).
 * -
 * - The use of 'include' allows for all the references to be maintained, but a very selective 'source'
 * - and 'filter' on the output files ensures that only the theme tokens are output.
 */
// colorThemes.forEach((theme) => {
//   StyleDictionary.extend({
//     transformGroup: {
//       figmaJson: [
//         "attribute/cti",
//         "name/cti/kebab",
//         "size/remToPx",
//         "colorTransform",
//         "color/css",
//       ],
//     },
//     transform: {
//       // Standard color value transformation
//       colorTransform: {
//         type: "value",
//         transitive: true,
//         matcher: (token) =>
//           token.attributes.category === "color" && token.modify,
//         transformer: transformColor,
//       },
//       // Make the standard color/css transitive
//       "color/css": Object.assign({}, StyleDictionary.transform[`color/css`], {
//         transitive: true,
//       }),
//     },
//     format: {
//       figmaJson: ({ dictionary }) => {
//         return getFigma({ dictionary, options: { theme: theme } });
//       },
//     },
//     // Include references from all files
//     include: [...brandFilePaths, ...uiFilePaths],
//     // Only output from the appropriate color theme file
//     source: [inputDirectory + "ui.theme." + theme + ".js"],
//     platforms: {
//       figma: {
//         transformGroup: "figmaJson",
//         buildPath: tempDirectory + "figma/",
//         files: [
//           {
//             destination: `${theme}.json`,
//             format: "figmaJson",
//             filter: (token) => {
//               return token.filePath.indexOf(theme) > -1;
//             },
//           },
//         ],
//       },
//       css: {
//         transformGroup: "css",
//         buildPath: outputDirectory + "css/",
//         files: [
//           {
//             destination: `theme.${theme}.css`,
//             format: "css/variables",
//             filter: (token) => {
//               return token.filePath.indexOf(theme) > -1;
//             },
//           },
//         ],
//       },
//     },
//   }).buildAllPlatforms();
// });

const figmaTempDirectory = `${tempDirectory}figma/`;
const figmaOutputDirectory = `${outputDirectory}figma/`;

fs.readdir(figmaTempDirectory, (error, files) => {
  return new Promise((resolve, reject) => {
    if (error) reject(error);

    let combinedJson = {};
    files.reverse().forEach((file) => {
      const content = fs.readFileSync(figmaTempDirectory + file, "utf8");
      combinedJson = { ...combinedJson, ...JSON.parse(content) };
    });

    resolve(combinedJson);
  }).then((data) => {
    if (!fs.existsSync(figmaOutputDirectory)) {
      fs.mkdirSync(figmaOutputDirectory);
    }
    fs.writeFileSync(
      `${figmaOutputDirectory}combined.json`,
      JSON.stringify(data)
    );
  });
});
