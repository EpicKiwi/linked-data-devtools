import * as RDFa from "./lib/rdfa-parser.js";

const BASE_RDFA_PREFIXES = {
  "dc:": "http://purl.org/dc/terms/",
  "owl:": "http://www.w3.org/2002/07/owl#",
  "rdf:": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  "rdfs:": "http://www.w3.org/2000/01/rdf-schema#",
  "rdfa:": "http://www.w3.org/ns/rdfa#",
  "foaf:": "http://xmlns.com/foaf/0.1/",
};

export function parsePrefixes(doc) {
  let prefixes = { ...BASE_RDFA_PREFIXES };
  for (let it of doc.querySelectorAll("[prefix]")) {
    let thisPrefixes = Object.fromEntries(
      it
        .getAttribute("prefix")
        .split(" ")
        .reduce(
          (acc, it, i, all) =>
            i % 2 == 0 && i + 1 < all.length ? [...acc, [it, all[i + 1]]] : acc,
          []
        )
    );
    prefixes = {...prefixes, ...thisPrefixes}
  }

  return prefixes;
}

export function parseDocument(doc, tipleFoundCallback) {
  const parser = new RDFa.RdfaParser({
    baseIRI: doc.documentElement.baseURI,
    contentType: "text/html",
  });

  parser.on("data", tipleFoundCallback);
  const promise = new Promise((res, rej) => {
    parser.on("end", res);
    parser.on("error", rej);
  });

  parser.write(`<!DOCTYPE html>`);
  parser.write(doc.documentElement.outerHTML);
  parser.end();

  return promise;
}

export function init(windowGlobalName) {
  const w = (window[windowGlobalName] = {
    parsingInProgress: false,
    prefixes: {},
    quads: [],
  });

  w.parsingInProgress = true;
  w.prefixes = parsePrefixes(document);
  parseDocument(document, (q) => w.quads.push(q)).finally(
    () => (w.parsingInProgress = false)
  );
}
