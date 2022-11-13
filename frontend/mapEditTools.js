const Edit = require("./tools/edit");
const Track = require("./tools/track");
const Signs = require("./tools/signs");
const Facilities = require("./tools/facilities");
const {ACL_FULL, ACL_ICONS_ONLY} = require("../lib/ACLS");
const CustomFacility = require("./tools/customFacility");
const Information = require("./tools/information");
const Select = require("./tools/select");
const TrackSplit = require("./tools/trackSplit");

class EditTools {
    EVENT_EDIT_MODE_ENABLED = 'editModeEnabled';
    EVENT_EDIT_MODE_DISABLED = 'editModeDisabled';
    EVENT_TOOL_SELECTED = 'toolSelected';
    EVENT_TRACK_ADDED = 'trackAdded';
    EVENT_TRACK_UPDATED = 'trackUpdated';
    EVENT_UPDATE_CANCELED = 'updateCanceled';
    EVENT_TRACK_DELETE = 'trackDelete';
    EVENT_ICON_ADDED = 'iconAdded';
    EVENT_ICON_DELETED = 'iconDeleted';
    EVENT_ICON_UPDATED = 'iconUpdated';
    EVENT_FEATURE_SELECTED = (type) => type + '-selected'
    EVENT_FEATURE_DESELECTED = (type) => type + '-deselected'
    EVENT_DECAY_UPDATE = 'decayUpdate'
    EVENT_DECAY_UPDATED = 'decayUpdated'

    editMode = false
    selectedTool = false
    listeners = {}


    /**
     * @param {import("ol").Map} map
     */
    constructor(map) {
        this.map = map

        this.edit = new Edit(this, map)
        this.information = new Information(this, map)
        this.sign = new Signs(this, map)
        this.facility = new Facilities(this, map)
        this.customFacility = new CustomFacility(this, map)
        this.track = new Track(this, map)
        this.trackSplit = new TrackSplit(this, map)
        this.select = new Select(this, map)
    }

    initAcl = (acl) => {
        this.acl = acl;
        if (acl === ACL_FULL || acl === ACL_ICONS_ONLY) {
            this.map.addControl(this.edit.control)
            this.map.addControl(this.information.control)
        }
        if (acl === ACL_FULL) {
            this.map.addControl(this.sign.control)
            this.map.addControl(this.facility.control)
            this.map.addControl(this.customFacility.control)
            this.map.addControl(this.track.control)
            this.map.addControl(this.trackSplit.control)
        }
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
        if (this.editMode && this.selectedTool !== newTool) {
            this.selectedTool = newTool
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