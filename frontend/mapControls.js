const {MousePosition, Control} = require("ol/control");
const LayerSwitcher = require("ol-layerswitcher");

const mousePositionControl = new MousePosition({
    className: 'custom-mouse-position',
    target: document.getElementById('mouse-position'),
    placeholder: '',
    coordinateFormat: (coordinate) => {
        let formatter = new Intl.NumberFormat(navigator.language, { maximumFractionDigits: 2 });
        return formatter.format(coordinate[0]) + ' / ' + formatter.format(coordinate[1]);
    }
});

const layerSwitcher = new LayerSwitcher({
    reverse: true,
    groupSelectStyle: 'group'
});

module.exports.addDefaultMapControls = function(map) {
    map.addControl(mousePositionControl);
    map.addControl(layerSwitcher);
}

let customControlTopPosition = 3.5;

module.exports.createCustomControl = function(label, clickHandler, options) {
    const defaultOptions = {
        elementClass: '',
        buttonClass: ''
    }
    options = {...defaultOptions, ...options}
    var button = document.createElement('button');
    button.innerHTML = label;
    button.className = options.buttonClass;

    button.addEventListener('click', (event) => {
        if (element.classList.contains('selected')) {
            element.classList.remove('selected')
        }
        else {
            element.classList.add('selected')
        }
        clickHandler(event, element);
    }, false);

    var element = document.createElement('div');
    element.className = 'ol-unselectable ol-control ' + options.elementClass;
    element.appendChild(button);
    element.style.left = '0.5em';
    element.style.top = customControlTopPosition + 'em';
    customControlTopPosition += 1.5;

    return new Control({
        element: element
    });
}