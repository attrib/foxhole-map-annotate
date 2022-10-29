import {Map} from "ol";

class Tools {
    editMode = false;
    selectedTool = false;
    listeners = {}

    /**
     * @param {Map} map
     */
    constructor(map) {
        this.map = map
    }

    changeMode(newMode) {
        if (this.editMode !== newMode) {
            this.editMode = newMode
            this.emit('editMode', this.editMode)
        }
    }

    emit(key, data) {
        if (key in this.listeners) {
            for (const listener in this.listeners[key]) {
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

export default Tools