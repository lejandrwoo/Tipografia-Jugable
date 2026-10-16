export class LabPanel {
    constructor() {
        this.container = document.getElementById('ui-layer');
        this.buildUI();
    }

    buildUI() {
        this.container.innerHTML = `<div id="brand-logo">autodesk</div>`;
    }
}
//comentario totalmente innesesario


