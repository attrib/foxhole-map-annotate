/** @import { EditTools } from "./mapEditTools.js" */
/** @import { Map as OlMap, Feature } from "ol" */
import { getCenter } from "ol/extent.js";
import { createCustomControlElement } from "./mapControls.js";
import { Control } from "ol/control.js";

/**
 * The flags class handles the flag sidebar and the flag button.
 */
export class Flags {
  /**
   * The minimum number of flags required to show a feature in the flagged list
   *
   * @readonly
   */
  MIN_FLAGS = 1;

  /**
   * The OpenLayers map instance
   *
   * @type {OlMap}
   */
  map;

  /**
   * The EditTools class containing all the tools and events
   *
   * @type {EditTools}
   */
  tools;

  /**
   * The button control for the flag sidebar
   *
   * @type {HTMLDivElement}
   */
  controlElement;

  /**
   * The control class for the button control on the map
   *
   * @type {Control}
   */
  control;

  /**
   * @type {HTMLTableSectionElement}
   */
  flagTable;

  /**
   * @type {DocumentFragment}
   */
  template;

  /**
   * @param {EditTools}  tools
   * @param {OlMap} map
   * @throws {Error} If the flagged table is not found in the DOM
   * @throws {Error} If the flagged template is not found in the DOM
   * @throws {Error} If the flagged offcanvas element is not found in the DOM
   */
  constructor(map, tools) {
    this.tools = tools;
    this.map = map;

    const flagTable = document.querySelector("#flagged tbody");

    if (!(flagTable instanceof HTMLTableSectionElement)) {
      throw new Error("Flagged table not found in DOM");
    }

    this.flagTable = flagTable;

    const flaggedTemplate = document.getElementById("flaggedTemplate");

    if (!(flaggedTemplate instanceof HTMLTemplateElement)) {
      throw new Error("Flagged template not found in DOM");
    }

    this.template = flaggedTemplate.content;

    const offcanvas = document.getElementById("flags");

    if (!(offcanvas instanceof HTMLDivElement)) {
      throw new Error("Flagged offcanvas element not found in DOM");
    }

    this.bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(offcanvas, {
      keyboard: true,
      backdrop: false,
      scroll: true,
    });

    offcanvas.addEventListener("show.bs.offcanvas", () => {
      this.flagTable.innerHTML = "";
      const features = [];

      for (const source of Object.values(tools.icon.sources)) {
        for (const feature of source.getFeatures()) {
          if ((feature.get("flags") || []).length < this.MIN_FLAGS) {
            continue;
          }
          features.push(feature);
        }
      }

      this.tools.line.allLinesCollection.forEach((feature) => {
        if ((feature.get("flags") || []).length < this.MIN_FLAGS) {
          return;
        }
        features.push(feature);
      });

      for (const feature of tools.polygon.source.getFeatures()) {
        if ((feature.get("flags") || []).length < this.MIN_FLAGS) {
          continue;
        }
        features.push(feature);
      }

      features.sort((a, b) => {
        const diff = b.get("flags").length - a.get("flags").length;
        if (diff !== 0) {
          return diff;
        }

        return a.get("time").localeCompare(b.get("time"));
      });

      features.forEach((feature) => {
        this.flagTable.append(this.createFlaggedItem(feature));
      });
    });

    this.tools.on(this.tools.EVENT_FEATURE_UPDATED, ({ operation, feature }) => {
      if (operation === "delete") {
        const element = document.getElementById("flag-" + feature.getId());

        if (element !== null) {
          element.remove();
        }
      }
    });

    this.tools.on(this.tools.EVENT_FLAGGED, ({ id, flags }) => {
      if (flags) {
        const element = document.getElementById("flag-" + id);
        if (flags.length === 0 && element) {
          element.remove();
        } else if (flags.length > 0 && !element) {
          const feature = this.findFeature(id);
          if (feature) {
            this.flagTable.append(this.createFlaggedItem(feature));
          }
        }
      }
    });

    this.controlElement = createCustomControlElement(
      "flag-fill",
      (e, selected) => {
        this.bsOffcanvas.show();
        this.controlElement.classList.remove("selected");
      },
      {
        elementClass: "flag-button",
        title: "Toggle Flag Sidebar",
      }
    );

    this.control = new Control({
      element: this.controlElement,
    });
  }

  /**
   * Search through all the source layers and find the feature with the
   * provided ID
   *
   * @param {string} id
   * @returns {Feature | null}
   */
  findFeature = (id) => {
    let feature;
    for (const source of Object.values(this.tools.icon.sources)) {
      feature = source.getFeatureById(id);
      if (feature) {
        return feature;
      }
    }
    feature = this.tools.line.allLinesCollection.getFeatureById(id);
    if (feature) {
      return feature;
    }
    feature = this.tools.polygon.source.getFeatureById(id);
    if (feature) {
      return feature;
    }
    return null;
  };

  /**
   * Clone the template and populate it with the provided feature data
   *
   * @param {Feature} feature
   * @returns {DocumentFragment}
   * @throws {Error} If the template is not correctly formed
   */
  createFlaggedItem = (feature) => {
    const flaggedItem = this.template.cloneNode(true);

    if (!(flaggedItem instanceof DocumentFragment)) {
      throw new Error("Flagged template is not a DocumentFragment");
    }

    const tableRow = flaggedItem.querySelector("tr");

    if (!(tableRow instanceof HTMLTableRowElement)) {
      throw new Error("Flagged template does not contain a table row");
    }

    tableRow.id = "flag-" + feature.getId();

    const iconCell = flaggedItem.querySelector(".icon");

    if (!(iconCell instanceof HTMLTableCellElement)) {
      throw new Error("Flagged template does not contain an icon cell");
    }

    switch (feature.get("type")) {
      case "line": {
        iconCell.innerHTML = '<i class="bi bi-pencil"></i>';
        break;
      }
      case "polygon": {
        iconCell.innerHTML = '<i class="bi bi-hexagon"></i>';
        break;
      }
      default: {
        iconCell.innerHTML = `<img src="${this.tools.icon.getImageUrl(feature)}">`;
        break;
      }
    }

    const userCell = flaggedItem.querySelector(".user");

    if (!(userCell instanceof HTMLTableCellElement)) {
      throw new Error("Flagged template does not contain a user cell");
    }

    userCell.innerHTML = feature.get("user");

    const flagsCell = flaggedItem.querySelector(".flagCount");

    if (!(flagsCell instanceof HTMLTableCellElement)) {
      throw new Error("Flagged template does not contain a flag count cell");
    }

    flagsCell.innerHTML = feature.get("flags").length;

    const targetAnchor = flaggedItem.querySelector("a.target");

    if (!(targetAnchor instanceof HTMLAnchorElement)) {
      throw new Error("Flagged template does not contain a target anchor");
    }

    targetAnchor.addEventListener("click", (event) => {
      event.preventDefault();

      const geometry = feature.getGeometry();

      if (geometry === undefined) {
        throw new Error("Feature does not have a geometry");
      }

      this.map.getView().animate({
        resolution: 0.75,
        center: getCenter(geometry.getExtent()),
        duration: 1000,
      });
      this.tools.select.selectFeature(feature);
    });

    const confirmAnchor = flaggedItem.querySelector("a.confirm");

    if (!(confirmAnchor instanceof HTMLAnchorElement)) {
      throw new Error("Flagged template does not contain a confirm anchor");
    }

    confirmAnchor.addEventListener("click", (event) => {
      event.preventDefault();
      this.tools.emit(this.tools.EVENT_UNFLAG, { id: feature.getId() });
    });

    const deleteAnchor = flaggedItem.querySelector("a.delete");

    if (!(deleteAnchor instanceof HTMLAnchorElement)) {
      throw new Error("Flagged template does not contain a delete anchor");
    }

    deleteAnchor.addEventListener("click", (event) => {
      event.preventDefault();
      this.tools.emit(this.tools.EVENT_ICON_DELETED, feature);
    });

    return flaggedItem;
  };
}

export default Flags;
