function getEntityId(quad){
    return quad.subject.value
}

function createAttributeElement(quad){
    let el = document.getElementById("attribute-template")
                .content.cloneNode(true);

    el.querySelector(".predicate").href = quad.predicate.value

    if(quad.object.termType == "Literal"){
        el.querySelector("p.object").textContent = quad.object.value
        el.querySelector("ext-iri.object").closest(".object-container").remove()
    } else {
        el.querySelector("ext-iri.object").href = quad.object.value
        el.querySelector("p.object").closest(".object-container").remove()
    }

    return el;
}

function createEntityElement(quad){
    const entityId = getEntityId(quad);

    let el = document.getElementById("entity-template")
                .content.cloneNode(true);

    const idEl = el.querySelector(".entity-id");
    idEl.textContent = entityId;
    idEl.href = entityId;

    el.querySelector(".entity").dataset.iri = entityId;

    return el;
}

export function appendQuad(quad){
    const entityId = getEntityId(quad)
    
    let entityEl = document.querySelector(`[data-iri="${entityId}"]`)

    if(!entityEl){
        let newEl = createEntityElement(quad);
        document.getElementById("quads").appendChild(newEl);
        entityEl = document.querySelector(`[data-iri="${entityId}"]`)
    }

    let attributeeEl = createAttributeElement(quad)
    entityEl.querySelector(".attributes").appendChild(attributeeEl)
}