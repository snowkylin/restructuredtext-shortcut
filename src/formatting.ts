'use strict';

import { commands, ExtensionContext, Position, Range, TextEditor, window } from 'vscode';

export function activate(context: ExtensionContext) {
    context.subscriptions.push(
        commands.registerCommand('extension.toggleBold', toggleBold),
        commands.registerCommand('extension.toggleItalic', toggleItalic),
        commands.registerCommand('extension.toggleInlineLiteral', toggleInlineLiteral),
        commands.registerCommand('extension.toggleLink', toggleLink)
    );
}

// Return Promise because need to chain operations in unit tests

function toggleBold() {
    return styleByWrapping(' **', '** ');
}

function toggleItalic() {
    return styleByWrapping(' *', '* ');
}

function toggleInlineLiteral() {
    return styleByWrapping(' ``', '`` ');
}

function toggleLink() {
    return styleByWrapping(' `', ' <>`_ ');
}

function styleByWrapping(startPattern: string, endPattern?: string | undefined) {
    if (endPattern === undefined) {
        endPattern = startPattern;
    }

    let editor = window.activeTextEditor;

    if (editor !== undefined){
        let selections = editor.selections;

        for (let i = 0; i < selections.length; i++) {
            var selection = editor.selections[i]; // 💩 get the latest selection range
            let cursorPos = selection.active;

            let options = {
                undoStopBefore: false,
                undoStopAfter: false
            };

            if (i === 0) {
                options.undoStopBefore = true;
            } else if (i === selections.length - 1) {
                options.undoStopAfter = true;
            }
            
            return wrapRange(editor, options, cursorPos, selection, true, startPattern, endPattern);
        }
    }
}

/**
 * Add or remove `startPattern`/`endPattern` according to the context
 * @param editor 
 * @param options The undo/redo behavior
 * @param cursor cursor position
 * @param range range to be replaced
 * @param isSelected is this range selected
 * @param startPattern 
 * @param endPattern 
 */
function wrapRange(editor: TextEditor, options: { undoStopBefore: boolean; undoStopAfter: boolean; }, cursor: Position, range: Range, isSelected: boolean, startPattern: string, endPattern?: string) {
    if (endPattern === undefined) {
        endPattern = startPattern;
    }

    let promise: Thenable<boolean>;

    let text = editor.document.getText(range);
    if (isWrapped(text, startPattern, endPattern)) {
        // remove start/end patterns from range
        promise = replaceWith(range, text.substr(startPattern.length, text.length - startPattern.length - endPattern.length), options);
    } else {
        // add start/end patterns around range
        promise = replaceWith(range, startPattern + text + endPattern, options);
    }

    return promise;
}

function isWrapped(text: string, startPattern: string, endPattern?: string | undefined): boolean {
    if (endPattern === undefined) {
        endPattern = startPattern;
    }
    return text.startsWith(startPattern) && text.endsWith(endPattern);
}

function replaceWith(range: Range, newText: string, options: { undoStopBefore: boolean; undoStopAfter: boolean; } | undefined) {
    let editor = window.activeTextEditor;
    if (editor !== undefined){
        return editor.edit(edit => {
            edit.replace(range, newText);
        }, options);
    } else {
        return Promise.reject('error');
    }
}