function handleShown() {
  
}

function handleHidden() {
  
}

browser.devtools.panels.create(
  "Linked Data", // title
  "../icons/icon.svg", // icon
  "panel/panel.html", // content
).then((newPanel) => {
  newPanel.onShown.addListener(handleShown);
  newPanel.onHidden.addListener(handleHidden);
});
