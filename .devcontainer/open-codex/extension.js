const vscode = require('vscode');
exports.activate = function () {
  vscode.commands.executeCommand('chatgpt.openSidebar');
};
exports.deactivate = function () {};
