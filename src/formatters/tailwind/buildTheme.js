const trimHyphens = require("../../utils/trimHyphens");

const getOutline = ({ dictionary }) => {
  return {
    violet: `1px solid var(--${dictionary.tokens.focus["ring-color"].name})`,
  };
};
const getObject = ({ tokens, filter, remove }) => {
  const matchingTokens = tokens.filter(filter);
  let object = {};
  matchingTokens.forEach((token) => {
    const key = trimHyphens(token.name.replace(remove, ""));
    object[key || "DEFAULT"] = `var(--${token.name})`;
  });
  return object;
};
const getFontSize = ({ tokens }) => {
  const matchingTokens = tokens.filter(
    (token) =>
      token.attributes.category === "size" &&
      ["font", "lineHeight"].includes(token.attributes.type)
  );
  const dictionary = matchingTokens.reduce((acc, cur) => {
    const slug = cur.name.replace("-line-height", "");
    return {
      ...acc,
      [slug]: {
        ...acc[slug],
        [cur.name]: cur,
      },
    };
  }, {});
  const list = Object.keys(dictionary).map((key) => {
    const slug = key.replace("size-", "");
    return {
      [slug]: [
        `var(--${dictionary[key][key].name})`,
        `var(--${dictionary[key][`${key}-line-height`].name})`,
      ],
    };
  });
  const fonts = list.reduce((acc, cur) => {
    return { ...acc, ...cur };
  }, {});
  return fonts;
};
const getColors = ({ tokens }) => {
  const matchingTokens = tokens.filter(
    (token) =>
      token.attributes.category === "color" && !token.filePath.includes("brand")
  );
  return matchingTokens.reduce((acc, token) => {
    const { type, item } = token.attributes;
    const key =
      trimHyphens(type.replace("color", "").replace("--", "-")) || "DEFAULT";
    return {
      ...acc,
      [token.path[0]]: {
        ...acc[token.path[0]],
        [key]: `var(--${token.name})`,
      },
    };
  }, {});
};
const getTheme = (dictionary) => {
  const tokens = dictionary.allTokens;

  return {
    colors: getColors({
      tokens,
    }),
    extend: {
      fontSize: getFontSize({
        tokens,
      }),
      fontFamily: getObject({
        remove: "family",
        tokens,
        filter: (token) =>
          token.attributes.category === "font" &&
          token.attributes.type === "family",
      }),
      boxShadow: getObject({
        remove: "shadow",
        tokens,
        filter: (token) =>
          token.attributes.category === "shadow" &&
          token.attributes.type === "matrix",
      }),
      borderWidth: getObject({
        remove: "line-width",
        tokens,
        filter: (token) =>
          token.attributes.category === "size" &&
          token.attributes.type === "lineWidth",
      }),
      borderRadius: getObject({
        remove: "radius",
        tokens,
        filter: (token) =>
          token.attributes.category === "size" &&
          token.attributes.type === "borderRadius",
      }),

      ringColor: {
        DEFAULT: `var(--${dictionary.tokens.focus["ring-color"].name})`,
      },
      outline: getOutline({ dictionary }),
      spacing: getObject({
        remove: "space",
        tokens,
        filter: (token) =>
          token.attributes.category === "size" &&
          token.attributes.type === "spacing",
      }),
    },
  };
};

module.exports = ({ dictionary }) => {
  return getTheme(dictionary);
};
