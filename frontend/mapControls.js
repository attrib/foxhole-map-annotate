import {MousePosition} from "ol/control";
import LayerSwitcher from "ol-layerswitcher";
import Search from "./Search";

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
    reverse: false,
    groupSelectStyle: 'children'
});

function addDefaultMapControls(map) {
    // map.addControl(mousePositionControl);
    map.addControl(layerSwitcher);
    map.addControl(new Search());
}

function enableLayerMemory(map) {
    // Load saved layer visibility state from localStorage.
    LayerSwitcher.forEachRecursive(map, (layer) => {
        const title = layer.get('title');
        if (title) {
            const itemName = `map.layers.${title}.visible`;
            const savedValue = localStorage.getItem(itemName);
            if (savedValue) {
                const visible = (localStorage.getItem(itemName) === 'true');
                layer.setVisible(visible);
            }
            else if (layer.get('defaultVisible') === false) {
                layer.setVisible(false);
            }
        }
    });

    // When layer visibility changes, save the layer's visibility state to
    // localStorage.
    LayerSwitcher.forEachRecursive(map, (layer) => {
        layer.on('change:visible', (e) => {
            const layer = e.target;
            const title = layer.get('title');
            if (title) {
                const visible = layer.get('visible');
                const itemName = `map.layers.${title}.visible`;
                localStorage.setItem(itemName, visible);
            }
        });
    });
}

let customControlTopPosition = 3.5;

function createCustomControlElement(label, clickHandler, options) {
    const defaultOptions = {
        elementClass: '',
        buttonClass: ''
    }
    options = {...defaultOptions, ...options}
    const button = document.createElement('button');
    button.innerHTML = '<i class="bi bi-' + label + '"></i>';
    button.className = options.buttonClass;
    if (options.title) {
        button.title = options.title
    }

    button.addEventListener('click', (event) => {
        const selected = element.classList.contains('selected')
        if (element.classList.contains('selected')) {
            element.classList.remove('selected')
        }
        else {
            element.classList.add('selected')
        }
        clickHandler(event, !selected, element);
    }, false);

    const element = document.createElement('div');
    element.className = 'ol-unselectable ol-control ' + options.elementClass;
    element.appendChild(button);

    if (options.left) {
        customControlTopPosition -= 1.5;
        element.style.left = options.left;
        element.style.top = customControlTopPosition + 'em';
    }
    else {
        element.style.left = '0.5em';
        element.style.top = customControlTopPosition + 'em';
    }
    customControlTopPosition += 1.5;

    return element;
}

export {createCustomControlElement, enableLayerMemory, addDefaultMapControls}