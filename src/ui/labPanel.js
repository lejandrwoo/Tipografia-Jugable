export class LabPanel {
    constructor() {
        this.container = document.getElementById('ui-layer');
        this.buildUI();
    }

    buildUI() {
        this.container.innerHTML = `
            <div id="brand-logo">autodesk</div>
            <div class="controls-overlay">
                <div class="control-item">
                    <span class="control-icon">1</span>
                    <span>Arrastra para lanzar</span>
                </div>
                <div class="control-item">
                    <span class="control-icon">2</span>
                    <span>Estira para romper</span>
                </div>
                <div class="control-item">
                    <span class="control-icon">3</span>
                    <span>Clics rápidos para inflar</span>
                </div>
            </div>
        `;
    }
}