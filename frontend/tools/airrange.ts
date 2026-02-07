import { Control } from "ol/control.js";

import { createCustomControlElement } from "../mapControls.js";

class AirRange {

    /**
     * @param {EditTools} tools
     * @param {import("ol").Map} map
     */
    constructor(tools, map) {
        this.map = map
        this.tools = tools
        this.controlElement = createCustomControlElement('airplane', (e, selected) => {
            tools.sidebarAirRange.bsOffcanvas.show()
            tools.sidebarAirRange.artyShow()
            this.controlElement.classList.remove('selected')
        }, {
            elementClass: 'airrange-button',
            title: 'Air Range Calculator',
        })
        this.control = new Control({
            element: this.controlElement
        })
    }
}


export default AirRange

