import LayerGroup from "ol/layer/Group";
import Edit from "./tools/edit";
import Arty from "./tools/arty";
import {ACL_READ, hasAccess} from "../lib/ACLS";
import Select from "./tools/select";
import {Group} from "ol/layer";
import {GeoJSON} from "ol/format";
import Sidebar from "./tools/sidebar";
import SidebarArty from "./tools/sidebarArty";
import Icon from "./tools/icon";
import Polygon from "./tools/polygon";
import Line from "./tools/line";
import Scissor from "./tools/scissor";
import Merge from "./tools/merge";

class EditTools {
  EVENT_EDIT_MODE_ENABLED = 'editModeEnabled';
  EVENT_EDIT_MODE_DISABLED = 'editModeDisabled';
  EVENT_TOOL_SELECTED = 'toolSelected';
  EVENT_UPDATE_CANCELED = 'updateCanceled';
  EVENT_ICON_ADDED = 'iconAdded';
  EVENT_ICON_DELETED = 'iconDeleted';
  EVENT_ICON_UPDATED = 'iconUpdated';
  EVENT_FLAG = 'flagFeature'
  EVENT_FLAGGED = 'flaggedFeature'
  EVENT_UNFLAG = 'unflagFeature'
  EVENT_FEATURE_SELECTED = (type) => {
    const t = type === 'line' || type === 'polygon' || type === 'stormCannon' ? type : 'icon'
    return t + '-selected'
  }
  EVENT_FEATURE_DESELECTED = (type) => {
    const t = type === 'line' || type === 'polygon' || type === 'stormCannon' ? type : 'icon'
    return t + '-deselected'
  }
  EVENT_DECAY_UPDATE = 'decayUpdate'
  EVENT_DECAY_UPDATED = 'decayUpdated'
  EVENT_FEATURE_UPDATED = 'featureUpdated'

  EVENT_ARTY_MODE_ENABLED = 'artyEnabled'
  EVENT_ARTY_MODE_DISABLED = 'artyDisabled'

  MAGIC_MAP_SCALING_FACTOR = 0.94

  editMode = false
  selectedTool = false
  listeners = {}
  iconTools = {}

  /**
   * @param {import("ol").Map} map
   */
  constructor(map) {
    this.map = map

    this.userId = document.getElementById('discord-username').dataset.userId;
    this.geoJson = new GeoJSON();

    this.facilitiesGroup = new Group({
      title: 'All Facilities',
      fold: 'close',
    })
    this.map.addLayer(this.facilitiesGroup)
    this.iconTools = {
      'information': {
        title: 'Information\'s',
        type: 'information',
        zIndex: 50,
      },
      'sign': {
        title: 'Signs',
        type: 'sign',
        zIndex: 30,
      },
      'base': {
        title: 'Bases',
        type: 'base',
        zIndex: 30,
        declutter: true,
      },
      'facility': {
        title: 'Public Facilities',
        type: 'facility',
        zIndex: 25,
        layerGroup: this.facilitiesGroup,
        layerPerIcon: true,
      },
      'facility-enemy': {
        title: 'Enemy Structures',
        type: 'facility-enemy',
        zIndex: 10,
        declutter: true,
      },
      'facility-private': {
        title: 'Private Facilities',
        type: 'facility-private',
        zIndex: 15,
        layerGroup: this.facilitiesGroup,
        layerPerIcon: true,
      },
    }

    this.sidebar = new Sidebar(this, map)
    this.sidebarArty = new SidebarArty(this, map)
    this.line = new Line(this, map)
    this.scissor = new Scissor(this, map)
    this.merge = new Merge(this, map)
    this.icon = new Icon(this, map)
    this.polygon = new Polygon(this, map)
    this.select = new Select(this, map)
    this.edit = new Edit(this, map)
    this.arty = new Arty(this, map)
  }

  resetAcl = () => {
    this.acl = ACL_READ;
    this.map.removeControl(this.edit.control)
    this.sidebar.setAcl(this.acl)
  }

  initAcl = (acl) => {
    this.acl = acl;
    if (acl !== ACL_READ) {
      this.map.addControl(this.edit.control)
      this.map.addControl(this.arty.control)
    }
    this.sidebar.setAcl(acl)
  }

  hasAccess = (action, feature = null) => {
    return hasAccess(this.userId, this.acl, action, this.geoJson.writeFeatureObject(feature))
  }

  changeMode = (newMode) => {
    if (newMode === undefined) {
      newMode = !this.editMode
    }
    if (this.editMode !== newMode) {
      this.editMode = newMode
      if (this.editMode) {
        this.emit(this.EVENT_EDIT_MODE_ENABLED)
        const editLayerTitles = ['Custom Areas', 'Train Lines', this.facilitiesGroup.get('title'), ...Object.keys(this.iconTools).map((key) => {
          return this.iconTools[key].title
        })]
        const nestVisibleTrue = (layer) => {
          if (layer instanceof LayerGroup) {
            layer.getLayers().forEach((subLayer) => {
              nestVisibleTrue(subLayer)
            })
          }
          layer.setVisible(true)
        }
        this.map.getLayers().forEach((layer) => {
          if (editLayerTitles.includes(layer.get('title'))) {
            nestVisibleTrue(layer)
          }
        })
      } else {
        if (this.selectedTool) {
          this.selectedTool = false
          this.emit(this.EVENT_TOOL_SELECTED, this.selectedTool)
        }
        this.emit(this.EVENT_EDIT_MODE_DISABLED)
      }
    }
  }

  changeTool = (newTool) => {
    if (this.editMode) {
      this.selectedTool = this.selectedTool !== newTool ? newTool : false
      this.emit(this.EVENT_TOOL_SELECTED, this.selectedTool)
    }
  }

  emit = (key, data) => {
    console.log("tools emit: " + key)
    if (key in this.listeners) {
      for (const listener of this.listeners[key]) {
        listener(data)
      }
    }
  }

  on = (key, callback) => {
    if (!(key in this.listeners)) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(callback)
  }

}

export default EditTools