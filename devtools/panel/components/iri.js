const TEMPLATE = document.createElement("template")
TEMPLATE.innerHTML = `<style>
:host {
    display: inline;
}

a {
    display: inherit;
    width: 100%;
    height: 100%;
    color: inherit;
    text-decoration: none;
}

.blank + * {
    opacity: 0.5;
}
</style>
<a id="link" target="_blank"></a>`

let PREFIXES = null;

class IRIElement extends HTMLElement {

    #href = null;

    get href(){
        return this.#href;
    }

    set href(val){
        this.#href = val;
        this.updateContent()
    }

    constructor(){
        super();
        this.attachShadow({mode: "open"});
        this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    }

    connectedCallback(){
        this.loadPrefixes()
        this.updateContent()

        this.shadowRoot.querySelector("a")
            .addEventListener("click", e => {
                let eve = new Event("click-iri", {bubbles: true, cancelable: true})
                if(!this.dispatchEvent(eve)){
                    e.preventDefault()
                }
            })
    }

    loadPrefixes(){
        if(PREFIXES) return;

        PREFIXES = {}

        for(let el of document.querySelectorAll(`meta[name="prefix"]`)){
            let [name, prefix] = el.getAttribute("content").split(" ", 2)
            PREFIXES[prefix] = name
        }

        let vocabEl = document.querySelector(`meta[name="vocab"]`)
        if(vocabEl && vocabEl.getAttribute("content")){
            PREFIXES[vocabEl.getAttribute("content")] = ""
        }
    }

    async updateContent(){
        if(!this.href) {
            return;
        }

        const inspectedUrl = (await browser.devtools.inspectedWindow
            .eval("window.location.toString()"))[0];
        
        let result = document.createTextNode(this.href)

        if(this.href.startsWith("df_")){
            result = document.createDocumentFragment()
            
            let blank = document.createElement("span")
            blank.textContent = "[blank node] ";
            blank.classList.add("blank")
            result.appendChild(blank)

            let value = document.createElement("span")
            value.textContent = this.href;
            result.appendChild(value)

        } else if(this.href == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"){
            result = document.createTextNode("a")
        } else if(this.href.startsWith(inspectedUrl) && this.href != inspectedUrl){
            result = document.createTextNode(this.href.substring(inspectedUrl.length))
        } else {
            let prefix = Object.entries(PREFIXES)
                .find(([key, value]) => key != this.href && this.href.startsWith(key))

            if(prefix){
                result = document.createTextNode(prefix[1]+this.href.substring(prefix[0].length))
            }
        }
        
        let el = this.shadowRoot.getElementById("link");
        el.innerHTML = "";
        el.appendChild(result);
        if(!this.parentElement.closest("[title]")){
            this.title = this.href
        }

        if(this.href.startsWith("df_")){
            el.href = "#"+this.href
            el.removeAttribute("target")
        } else {
            el.href = this.href
        }
    }

    static get observedAttributes(){
        return ["href"]
    }

    attributeChangedCallback(name, oldVal, newVal){
        switch(name){
            case "href":
                this.href = newVal;
                break;
        }
    }

}

customElements.define("ext-iri", IRIElement)