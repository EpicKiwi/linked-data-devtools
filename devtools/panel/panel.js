import { appendQuad } from "./ui.js";

const w = browser.devtools.inspectedWindow;
const windowGlobal = `__${browser.runtime.id}`;

async function initQuadParsing() {
    document.getElementById("quads").innerHTML = "";
    document.getElementById("triple-count").textContent = 0;

  const contentUrl = browser.runtime.getURL("devtools/panel/page-script.js");
  await w.eval(`import("${contentUrl}").then(s => s.init("${windowGlobal}"))`);

  async function isParsing() {
    return (await w.eval(`window["${windowGlobal}"].parsingInProgress`))[0];
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
    if (parsing === undefined || parsing) {
      setTimeout(() => pollQuads(cb), 300);
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
    appendQuad(q);
  });
}

initQuadParsing();

document.getElementById("quads")
  .addEventListener("click-iri", (e) => {
    let el = document.querySelector(`[data-iri="${e.target.href}"]`);
    if (el && e.target.closest(".entity") != el) {
      e.preventDefault();
      navigateToIRI(e.target.href);
    }
  });

browser.devtools.network.onNavigated.addListener(() => {
  initQuadParsing();
});

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
}

function navigateToIRI(iri){
    clearSelection()
    const elFound = document.querySelector(`[data-iri="${iri}"]`);
    elFound?.classList.add("selected")
    elFound?.scrollIntoView({behavior: "smooth"});
}

function clearSelection(){
    for(let it of document.querySelectorAll(".selected")){
        it.classList.remove("selected")
    }
}

function deselectIRI(){
    clearSelection()
}