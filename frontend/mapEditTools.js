const Edit = require("./tools/edit");
const Track = require("./tools/track");
const Warning = require("./tools/warning");
const Danger = require("./tools/danger");

class EditTools {
    EVENT_EDIT_MODE_ENABLED = 'editModeEnabled';
    EVENT_EDIT_MODE_DISABLED = 'editModeDisabled';
    EVENT_TOOL_SELECTED = 'toolSelected';
    EVENT_TRACK_ADDED = 'trackAdded';
    EVENT_TRACK_UPDATED = 'trackUpdated';
    EVENT_TRACK_UPDATE_CANCELED = 'trackUpdateCanceled';

    editMode = false
    selectedTool = false
    listeners = {}


    /**
     * @param {import("ol").Map} map
     */
    constructor(map) {
        this.map = map

        const edit = new Edit(this, map)
        map.addControl(edit.control)

        const track = new Track(this, map)
        map.addControl(track.control)

        const warning = new Warning(this, map)
        map.addControl(warning.control)

        const danger = new Danger(this, map)
        map.addControl(danger.control)
    }

    changeMode(newMode) {
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

    changeTool(newTool) {
        if (this.editMode && this.selectedTool !== newTool) {
            this.selectedTool = newTool
            this.emit(this.EVENT_TOOL_SELECTED, this.selectedTool)
        }
    }

    emit(key, data) {
        console.log(key)
        if (key in this.listeners) {
            for (const listener of this.listeners[key]) {
                listener(data)
            }
        }
    }

    on(key, callback) {
        if (!(key in this.listeners)) {
            this.listeners[key] = [];
        }
        this.listeners[key].push(callback)
    }

}

module.exports = EditTools