import * as RDFa from "./lib/rdfa-parser.js"

export function parseDocument(doc, tipleFoundCallback){
    const parser = new RDFa.RdfaParser({
        baseIRI: doc.documentElement.baseURI,
        contentType: 'text/html'
    });

    parser.on("data", tipleFoundCallback)
    const promise = new Promise((res,rej) => {
        parser.on("end", res)
        parser.on("error", rej)
    })

    parser.write(`<!DOCTYPE html>`)
    parser.write(doc.documentElement.outerHTML);
    parser.end()

    return promise;
}

export function init(windowGlobalName){
    const w = window[windowGlobalName] = {
        parsingInProgress: false,
        quads: []
    }

    w.parsingInProgress = true;
    parseDocument(document, q => w.quads.push(q))
        .finally(() => w.parsingInProgress = false)
}