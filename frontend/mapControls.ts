import { MousePosition } from "ol/control.js";
import LayerSwitcher from "ol-layerswitcher";

import Search from "./Search.js";
import { title } from "process";

const mousePositionControl = new MousePosition({
  className: 'custom-mouse-position',
  target: document.getElementById('mouse-position'),
  placeholder: '',
  coordinateFormat: (coordinate) => {
    let formatter = new Intl.NumberFormat(navigator.language, {maximumFractionDigits: 2});
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
      } else if (layer.get('defaultVisible') === false) {
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

function toggleLayersFunction(map) {

  const button = document.createElement('button');
  button.type = 'button';
  button.checked = true;
  button.textContent = 'Toggle all';
  button.addEventListener('click', () => {button.checked = !button.checked;});
  button.addEventListener('click', () => {
    LayerSwitcher.forEachRecursive(map, layer => {
      if (layer.get('type') !== 'base' && layer.get('title')) {
        layer.setVisible(button.checked);
        //Necessary to update visual checkboxes in layer switcher
        const title = layer.get('title');
        const labels = document.querySelectorAll('.layer-switcher label');
        for (const label of labels) {
          if (label.textContent.trim() === title) {
            const inputId = label.htmlFor;
            const checkbox = document.getElementById(inputId);
            if (checkbox) {
              checkbox.checked = button.checked;
            }
          }
        }
      }
    });
  });

  const panel = document.querySelector('.layer-switcher .panel');

  // Adds a "Toggle all overlays" button to the layer switcher panel.
  function createToggleAllButton() {
    requestAnimationFrame(() => {
    
    if (!panel) return;

    const ul = panel.querySelector(':scope > ul');
    if (!ul) return;

    if (ul.querySelector('.toggle-all')) return;

    const li = document.createElement('li');
    li.className = 'layer toggle-all';

    li.appendChild(button);
    
    ul.append(li);
    });
  };
  
  layerSwitcher.on('render', () => {createToggleAllButton()});

  LayerSwitcher.forEachRecursive(map, layer => {
    layer.on('change:visible', () => {
      createToggleAllButton();
    });
});
};


let customControlTopPosition = 8.5;

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
    } else {
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
    element.style.top = customControlTopPosition + 'rem';
  } else {
    element.style.left = '1rem';
    element.style.top = customControlTopPosition + 'rem';
  }
  customControlTopPosition += 1.5;

  return element;
}

export {createCustomControlElement, enableLayerMemory, addDefaultMapControls, toggleLayersFunction}