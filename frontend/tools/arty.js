const {createCustomControlElement} = require("../mapControls");
const {Control} = require("ol/control");

class Arty {

 
 
  /**
   * @param {EditTools} tools
   * @param {import("ol").Map} map
   */
  
  constructor(tools, map){
    this.map = map
    this.tools = tools
    this.controlElement = createCustomControlElement('triangle', (e, selected) => {
      tools.sidebarArty.bsOffcanvas.show()
      tools.sidebarArty.artyShow()
      this.controlElement.classList.remove('selected')
    }, {
      elementClass: 'arty-button',
      title: 'Toggle Artillery Calculator (e)',
    })
    this.control = new Control({
      element: this.controlElement
    })
  }
}


module.exports = Arty

