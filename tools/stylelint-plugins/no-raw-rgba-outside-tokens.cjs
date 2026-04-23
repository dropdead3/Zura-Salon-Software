/**
 * zura/no-raw-rgba-outside-tokens
 *
 * Bans raw `rgba(…)` / `rgb(…)` literals in CSS except when:
 *   1. They live inside a `:root` or `.dark` token definition block, OR
 *   2. The declaration is immediately preceded by a comment containing
 *      "intentional literal" (case-insensitive).
 *
 * This is the authoring-time enforcement of the Step 2E/2F canon: surface
 * colors must resolve through HSL tokens so dark mode works; pure-literal
 * values are theme-blind and have been a recurring regression class.
 */
const stylelint = require("stylelint");

const ruleName = "zura/no-raw-rgba-outside-tokens";
const messages = stylelint.utils.ruleMessages(ruleName, {
  rawLiteral: () =>
    "Raw rgba/rgb literal outside token definition. Use hsl(var(--token) / alpha) or annotate with /* intentional literal: <reason> */ above this line.",
});

const meta = { url: "https://getzura.com/docs/canon/no-raw-rgba" };

const LITERAL_RE = /\brgba?\(\s*\d/i;

function isTokenDefinitionSelector(selector) {
  if (!selector) return false;
  // Trim and split on comma for multi-selector rules
  return selector.split(",").some((sel) => {
    const s = sel.trim();
    return (
      s === ":root" ||
      s === ".dark" ||
      s.startsWith(":root ") ||
      s.startsWith(".dark ") ||
      s.startsWith(":root,") ||
      s.startsWith(".dark,") ||
      s.startsWith(":root.") ||
      s.startsWith(".dark.")
    );
  });
}

function hasIntentionalLiteralComment(decl) {
  // Walk previous siblings, skipping whitespace-only nodes, looking for the
  // most recent comment. If it mentions "intentional literal", allow.
  let prev = decl.prev();
  while (prev) {
    if (prev.type === "comment") {
      return /intentional\s+literal/i.test(prev.text);
    }
    // Any non-comment node between the decl and the comment invalidates it
    // — except other decls, which happens in real CSS. We only care about
    // the *immediately* preceding comment, so stop at the first non-comment.
    return false;
  }
  return false;
}

module.exports = stylelint.createPlugin(ruleName, (primary) => {
  return (root, result) => {
    const validOptions = stylelint.utils.validateOptions(result, ruleName, {
      actual: primary,
      possible: [true, false],
    });
    if (!validOptions || !primary) return;

    root.walkDecls((decl) => {
      if (!LITERAL_RE.test(decl.value)) return;

      // Allow inside :root / .dark token blocks
      const parent = decl.parent;
      if (parent && parent.type === "rule" && isTokenDefinitionSelector(parent.selector)) {
        return;
      }

      // Allow with escape-hatch comment
      if (hasIntentionalLiteralComment(decl)) return;

      stylelint.utils.report({
        message: messages.rawLiteral(),
        node: decl,
        result,
        ruleName,
      });
    });
  };
});

module.exports.ruleName = ruleName;
module.exports.messages = messages;
module.exports.meta = meta;
