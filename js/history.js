/**
 * history.js — Pilha Undo/Redo
 */

const MAX_HISTORY = 50;

class HistoryManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this._listeners = [];
    }

    push(state) {
        this.undoStack.push(deepClone(state));
        if (this.undoStack.length > MAX_HISTORY) {
            this.undoStack.shift();
        }
        this.redoStack = [];
        this._notify();
    }

    undo(currentState) {
        if (this.undoStack.length === 0) return null;
        this.redoStack.push(deepClone(currentState));
        const prev = this.undoStack.pop();
        this._notify();
        return prev;
    }

    redo(currentState) {
        if (this.redoStack.length === 0) return null;
        this.undoStack.push(deepClone(currentState));
        const next = this.redoStack.pop();
        this._notify();
        return next;
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
        this._notify();
    }

    onChange(fn) {
        this._listeners.push(fn);
    }

    _notify() {
        this._listeners.forEach(fn => fn({
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        }));
    }
}

function captureState(project) {
    return {
        elementos: deepClone(project.elementos),
        background: deepClone(project.background),
        titulo: project.titulo
    };
}

function applyState(project, state) {
    project.elementos = deepClone(state.elementos);
    project.background = deepClone(state.background);
    if (state.titulo !== undefined) project.titulo = state.titulo;
}
