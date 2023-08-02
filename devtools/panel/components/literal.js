const TEMPLATE = document.createElement("template")
TEMPLATE.innerHTML = `<style>
:host {
    display: inline;
}

.badge {
    background: #ededf0;
    border: solid 1px #cfcfd5; 
    border-radius: 3px;
    vertical-align: middle;
    line-height: 1;
    font-size: 0.7em;
    padding: 0.05em 0.1em;
    display: inline-block;
}

#lang-indicator {
    text-transform: uppercase;
}

[hidden] {
    display: none !important;
}
</style>
<slot></slot> <span id="lang-indicator" class="badge" hidden></span> <span id="data-type" class="badge" hidden ><ext-iri></ext-iri></span>`

const COMMON_TYPES = [
    "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString"
]

class LiteralElement extends HTMLElement {

    #language = null;

    get language(){
        return this.#language
    }

    set language(val){
        this.#language = val;
        this.updateLang()
    }

    #type = null;

    get type(){
        return this.#type
    }

    set type(val){
        this.#type = val;
        this.updateType()
    }

    constructor(){
        super();
        this.attachShadow({mode: "open"});
        this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    }

    connectedCallback(){
        this.updateLang()
        this.updateType()
    }

    updateType() {
        let el = this.shadowRoot.getElementById("data-type")
        let show_type = this.type && COMMON_TYPES.indexOf(this.type) < 0;

        el.hidden = !show_type
        if(show_type){
            el.querySelector("ext-iri").href = this.type;
            el.title = `Data type : ${this.type}`
        }
    }

    updateLang(){
        let el = this.shadowRoot.getElementById("lang-indicator")
        el.hidden = !!!this.language
        if(this.language){
            el.textContent = this.language
            el.title = `Literal language : ${this.language}`
        }
    }

    static get observedAttributes() {
        return ['language', 'type'];
    }

    attributeChangedCallback(name, oldVal, newVal) {
        switch(name) {
            case "type":
                this.type = newVal;
                break;
            case "language":
                this.language = newVal;
                break;
        }
    }
}

customElements.define("ext-literal", LiteralElement)