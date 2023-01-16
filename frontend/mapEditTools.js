const Edit = require("./tools/edit");
const Arty = require("./tools/arty");
const {ACL_READ, hasAccess} = require("../lib/ACLS");
const Select = require("./tools/select");
const {Group} = require("ol/layer");
const {GeoJSON} = require("ol/format");
const Sidebar = require("./tools/sidebar");
const SidebarArty = require("./tools/sidebarArty");
const Icon = require("./tools/icon");
const Polygon = require("./tools/polygon");
const Line = require("./tools/line");
const Scissor = require("./tools/scissor");


class EditTools {
    EVENT_EDIT_MODE_ENABLED = 'editModeEnabled';
    EVENT_EDIT_MODE_DISABLED = 'editModeDisabled';
    EVENT_TOOL_SELECTED = 'toolSelected';
    EVENT_UPDATE_CANCELED = 'updateCanceled';
    EVENT_ICON_ADDED = 'iconAdded';
    EVENT_ICON_DELETED = 'iconDeleted';
    EVENT_ICON_UPDATED = 'iconUpdated';
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
            },
            'facility': {
                title: 'Facilities',
                type: 'facility',
                zIndex: 25,
                layerGroup: this.facilitiesGroup,
            },
            'facility-enemy': {
                title: 'Enemy Structures',
                type: 'facility-enemy',
                zIndex: 10,
            },
            'facility-private': {
                title: 'Private Facilities',
                type: 'facility-private',
                zIndex: 15,
                layerGroup: this.facilitiesGroup,
            },
        }

        this.sidebar = new Sidebar(this, map)
        this.sidebarArty = new SidebarArty(this, map)
        this.line = new Line(this, map)
        this.scissor = new Scissor(this, map)
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
            }
            else {
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

module.exports = EditTools