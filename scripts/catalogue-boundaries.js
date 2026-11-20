import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const api = "apps/api/src/";
const layers = {
  domain: ["domain"],
  ports: ["domain", "ports"],
  services: ["domain", "ports", "services"],
  adapters: ["domain", "ports", "adapters"],
  http: ["domain", "services", "http"],
};

const fromRoot = (path) => relative(root, path).replaceAll("\\", "/");

function workspace(path) {
  return /^(apps\/(api|web)|packages\/contracts)\//.exec(path)?.[1];
}

function layer(path) {
  const name = path.slice(api.length).split("/")[0];
  if (path.startsWith(api) && Object.hasOwn(layers, name)) return name;
}

export const catalogueBoundaries = {
  meta: {
    type: "problem",
    schema: [],
    messages: { dependency: "{{reason}}" },
  },
  create(context) {
    const importer = fromRoot(context.filename);
    const importerWorkspace = workspace(importer);
    const importerLayer = layer(importer);
    const presentational =
      /^apps\/web\/src\/(features\/[^/]+\/components|shared\/ui)\//.test(
        importer,
      );

    function check(node) {
      const specifier = node.source?.value;
      if (typeof specifier !== "string" || !importerWorkspace) return;

      const target = specifier.startsWith(".")
        ? fromRoot(resolve(dirname(context.filename), specifier))
        : undefined;
      const targetLayer = target && layer(target);

      function report(reason) {
        context.report({ node, messageId: "dependency", data: { reason } });
      }

      if (target && workspace(target) !== importerWorkspace) {
        report(
          "Import another workspace through its public package, using @catalogue/contracts.",
        );
      } else if (/^@catalogue\/(api|web)(\/|$)/.test(specifier)) {
        report(
          "Application workspaces communicate through the shared contracts and the HTTP API.",
        );
      } else if (
        targetLayer === "adapters" &&
        importerLayer !== "adapters" &&
        importer !== api + "composition-root.ts" &&
        !importer.startsWith("apps/api/test/") &&
        !importer.startsWith("apps/api/scripts/")
      ) {
        report("Wire adapters in the composition root.");
      } else if (
        importerLayer &&
        targetLayer &&
        !layers[importerLayer].includes(targetLayer)
      ) {
        report(
          `The ${importerLayer} layer cannot depend on the ${targetLayer} layer.`,
        );
      } else if (
        ["domain", "ports", "services"].includes(importerLayer) &&
        !targetLayer
      ) {
        report(
          `The ${importerLayer} layer can only import from its allowed internal layers.`,
        );
      } else if (
        presentational &&
        (specifier === "@tanstack/react-query" ||
          (target &&
            (/\/shared\/api\//.test(target) ||
              /\/(api|queries|mutations)(\.[^/]+)?$/.test(target))))
      ) {
        report("Keep data fetching in pages and containers.");
      }
    }

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
      ImportExpression: check,
    };
  },
};
