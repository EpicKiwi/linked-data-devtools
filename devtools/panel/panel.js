import { appendQuad } from "./ui.js";
import "./lib/jsonld.js"
import datasetFactory from "./lib/rdf-dataset.js"

const w = browser.devtools.inspectedWindow;
const windowGlobal = `__${browser.runtime.id}`;

let dataset = null;

function setLoading(state) {
  document.getElementById("loading").hidden = !state;
}

async function initHighlighting(){
    await w.eval(`(() => {
        const styleEl = document.createElement("style")
        styleEl.innerHTML = "body.__rdfa_highlight [resource]:not([property]), body.__rdfa_highlight [resource][typeof] {background: rgba(221, 0, 169, 0.25) !important;}"
        document.head.appendChild(styleEl)
    })()`);
}

async function toggleHighlight(){
    let result = (await w.eval(`document.body.classList.toggle("__rdfa_highlight")`))[0];
    document.getElementById("highlight").classList.toggle("active", result)
}

document.getElementById("highlight").addEventListener("click", toggleHighlight)

function initPrefixes(prefixes){
  for(let it of document.querySelectorAll(`meta[name="prefix"]`)){
    let [name, value] = it.getAttribute("content").split(" ", 2);

    if(!prefixes[name] || prefixes[name] != value){
      it.remove()
    }
  }

  for(let [name, value] of Object.entries(prefixes)){
    let existing = document.querySelector(`meta[name="prefix"][content="${name} ${value}"]`)
    if(!existing) {
      let meta = document.createElement("meta")
      meta.name = "prefix"
      meta.content = `${name} ${value}`
      document.head.appendChild(meta)
    }
  }
}

function initVocab(vocab){
  for(let it of document.querySelectorAll(`meta[name="vocab"]`)){
    it.remove()
  }

  if(vocab){
    let meta = document.createElement("meta")
    meta.name = "vocab"
    meta.content = vocab
    document.head.appendChild(meta)
  }
}

async function initQuadParsing() {
  dataset = datasetFactory.dataset([]);

  document.getElementById("quads").innerHTML = "";
  document.getElementById("triple-count").textContent = 0;

  const contentUrl = browser.runtime.getURL("devtools/panel/page-script.js");
  await w.eval(`import("${contentUrl}").then(s => s.init("${windowGlobal}"))`);

  async function isParsing() {
    return (await w.eval(`window["${windowGlobal}"].parsingInProgress`))[0];
  }

  async function getPrefixes() {
    return (await w.eval(`window["${windowGlobal}"].prefixes`))[0];
  }

  async function getVocab() {
    return (await w.eval(`window["${windowGlobal}"].vocab`))[0];
  }

  async function popQuads() {
    return (await w.eval(`(() => {
            const w = window["${windowGlobal}"];
            if(!w) return [];
            const quads = Array.from(w.quads);
            w.quads.splice(0, w.quads.length);
            return quads
        })()`))[0];
  }

  async function pollQuads(cb) {
    const parsing = await isParsing();
    setLoading(parsing)
    if (parsing === undefined || parsing) {
      setTimeout(() => pollQuads(cb), 300);
    } else {
      updateTransformedData()
    }
    
    getVocab().then(v => {
      initVocab(v)
    })

    let prefixesInit = false;
    if(!prefixesInit){
      getPrefixes().then(p => {
        if(!prefixesInit && p){
          initPrefixes(p)
          prefixesInit = true;
        }
      })
    }

    popQuads().then((quads) => {
      if (quads) {
        for (let q of quads) {
          cb(q);
        }
      }
    });
  }

  let tripleCount = 0;
  pollQuads((q) => {
    tripleCount++;
    document.getElementById("triple-count").textContent = tripleCount;
    dataset.add(q);
    appendQuad(q);
  });
}

document.getElementById("quads")
  .addEventListener("click-iri", async (e) => {
    let el = document.querySelector(`[data-iri="${e.target.href}"]`);

    let localTarget = null;
    let directInteraction = false;

    if (el && e.target.closest(".entity") != el) {
      localTarget = e.target.href
    } else if(el && e.target.closest(".entity h1") != el) {
      localTarget = e.target.href
      directInteraction = true;
    }

    if(localTarget) {
      e.preventDefault();
      if(document.querySelector(`[data-iri].selected`)?.dataset.iri == localTarget){
        deselectIRI()
      } else {
        navigateToIRI(localTarget, !directInteraction);
      }
    }
  });

browser.devtools.network.onNavigated.addListener(async () => {
  await Promise.all([
    initQuadParsing(),
    initHighlighting()
  ]);
  await updateTransformedData();
});
Promise.all([
  initQuadParsing(),
  initHighlighting()
]).then(() => updateTransformedData())

browser.devtools.panels.elements.onSelectionChanged.addListener(() => {
    w.eval(`(() => {
        let el = $0.closest("[resource]");
        if(el){
            return (new URL(el.getAttribute("resource"), el.baseURI)).toString()
        } else {
            return null;
        }
    })()
    `)
    .then((result) => {
        if(result[0]){
            selectIRI(result[0])
        } else {
            deselectIRI()
        }
    });
});

function selectIRI(iri){
    clearSelection()
    const elFound = document.querySelector(`[data-iri="${iri}"]`);
    elFound?.classList.add("selected")
    elFound?.scrollIntoView({behavior: "auto"})
    updateTransformedData();
}

function navigateToIRI(iri, scrollTo = true){
    clearSelection()
    const elFound = document.querySelector(`[data-iri="${iri}"]`);
    elFound?.classList.add("selected")
    if(scrollTo){
      elFound?.scrollIntoView({behavior: "smooth"});
    }
    updateTransformedData();
}

function clearSelection(){
    for(let it of document.querySelectorAll(".selected")){
        it.classList.remove("selected")
    }
}

function deselectIRI(){
    clearSelection();
    updateTransformedData();
}

document.getElementById("transform-data-btn").addEventListener("click", e => {
  if( document.getElementById("transform-data-btn").classList.contains("active") ){
    document.getElementById("transform-data-btn").classList.remove("active")
    document.getElementById("tool-panel").hidden = true
  } else {
    openTransformPanel()
  }
})

document.getElementById("transform-context-sensitive").addEventListener("change", () => {
  updateTransformedData()
})

document.getElementById("transform-options").addEventListener("submit", e => {
  e.preventDefault()
  updateTransformedData()
})

document.getElementById("download-transformed-data").addEventListener("click", () => {
  let json = document.getElementById("transformed-data").textContent;
  let url = `data:application/json;base64,${btoa(json)}`
  window.open(url, "_blank")
})

function openTransformPanel(){
  document.getElementById("transform-data-btn").classList.add("active")
  document.getElementById("tool-panel").hidden = false;
  updateTransformedData()
}

async function updateTransformedData(){
  async function getLocation() {
    return (await w.eval(`document.body.baseURI`))[0];
  }

  let codeEl = document.getElementById("transformed-data");
  let configData = new FormData(document.getElementById("transform-options"));
  
  let base = new URL(await getLocation());

  let context = {
    "@base": base.toString()
  };

  for(let it of document.querySelectorAll(`meta[name="prefix"]`)){
    let [name, value] = it.getAttribute("content").split(" ", 2);

    context[name.replace(":","")] = value
  }

  let vocabMetaEl = document.querySelector(`meta[name="vocab"]`)
  if(vocabMetaEl) {
    context["@vocab"] = vocabMetaEl.content
  }

  let json = await jsonld.fromRDF(dataset)
  if(configData.get("context-sensitive")){
    let selectedEl = document.querySelector(`[data-iri].selected`)
    if(selectedEl) {
      base = new URL(selectedEl.dataset.iri, base)
    }

    json = await jsonld.frame(json, {
      "@context": context,
      "@id": base.toString()
    })
  } else {
    json = await jsonld.compact(json, context)
  }

  codeEl.textContent = JSON.stringify(json, null, 4)

  let evCode = `window.$ld = JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(json))}"))`
  await w.eval(evCode)
}